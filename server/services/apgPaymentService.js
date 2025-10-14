// services/apgPaymentService.js
const CryptoJS = require('crypto-js');
const axios = require('axios');

class APGPaymentService {
  constructor() {
    this.config = {
      CHANNEL_ID: '1002',
      MERCHANT_ID: process.env.APG_MERCHANT_ID,
      STORE_ID: process.env.APG_STORE_ID,
      MERCHANT_HASH: process.env.APG_MERCHANT_HASH,
      MERCHANT_USERNAME: process.env.APG_MERCHANT_USERNAME,
      MERCHANT_PASSWORD: process.env.APG_MERCHANT_PASSWORD,
      RETURN_URL: process.env.APG_RETURN_URL,
      ENCRYPTION_KEY1: process.env.APG_ENCRYPTION_KEY1,
      ENCRYPTION_KEY2: process.env.APG_ENCRYPTION_KEY2,
      CURRENCY: 'PKR',
      BASE_URL: process.env.NODE_ENV === 'production'
        ? 'https://payments.bankalfalah.com'
        : 'https://sandbox.bankalfalah.com'
    };

    // Validate configuration
    this.validateConfig();
  }

  validateConfig() {
    const required = [
      'MERCHANT_ID', 'STORE_ID', 'MERCHANT_HASH',
      'MERCHANT_USERNAME', 'MERCHANT_PASSWORD',
      'ENCRYPTION_KEY1', 'ENCRYPTION_KEY2', 'RETURN_URL'
    ];

    const missing = required.filter(key => !this.config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing APG configuration: ${missing.join(', ')}`);
    }
  }

  // Generate encrypted request hash
  generateRequestHash(paramsString) {
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(paramsString),
      CryptoJS.enc.Utf8.parse(this.config.ENCRYPTION_KEY1),
      {
        keySize: 128 / 8,
        iv: CryptoJS.enc.Utf8.parse(this.config.ENCRYPTION_KEY2),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    return encrypted.toString();
  }

  // Create parameter string from object
  createParamsString(params) {
    return Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');
  }

  // Step 1: Initiate Handshake
  async initiateHandshake(transactionRef) {
    const params = {
      HS_ChannelId: this.config.CHANNEL_ID,
      HS_MerchantId: this.config.MERCHANT_ID,
      HS_StoreId: this.config.STORE_ID,
      HS_ReturnURL: this.config.RETURN_URL,
      HS_MerchantHash: this.config.MERCHANT_HASH,
      HS_MerchantUsername: this.config.MERCHANT_USERNAME,
      HS_MerchantPassword: this.config.MERCHANT_PASSWORD,
      HS_TransactionReferenceNumber: transactionRef
    };

    const paramsString = this.createParamsString(params);
    const requestHash = this.generateRequestHash(paramsString);

    const requestBody = {
      ...params,
      HS_RequestHash: requestHash
    };

    try {
      const response = await axios.post(
        `${this.config.BASE_URL}/HS/api/HSAPI/HSAPI`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data.success === 'true') {
        return {
          success: true,
          authToken: response.data.AuthToken,
          returnURL: response.data.ReturnURL
        };
      } else {
        throw new Error(response.data.ErrorMessage || 'Handshake failed');
      }
    } catch (error) {
      console.error('[APG] Handshake error:', error.message);
      throw new Error(`Payment gateway handshake failed: ${error.message}`);
    }
  }

  // Step 2: Initiate Transaction
  async initiateTransaction(authToken, orderData) {
    const params = {
      ChannelId: this.config.CHANNEL_ID,
      MerchantId: this.config.MERCHANT_ID,
      StoreId: this.config.STORE_ID,
      MerchantHash: this.config.MERCHANT_HASH,
      MerchantUsername: this.config.MERCHANT_USERNAME,
      MerchantPassword: this.config.MERCHANT_PASSWORD,
      ReturnURL: this.config.RETURN_URL,
      Currency: this.config.CURRENCY,
      AuthToken: authToken,
      TransactionTypeId: orderData.paymentMethodType, // 1 or 2
      TransactionReferenceNumber: orderData.transactionRef,
      TransactionAmount: orderData.amount.toString(),
      AccountNumber: orderData.accountNumber,
      Country: '164', // Pakistan
      EmailAddress: orderData.email,
      MobileNumber: orderData.mobile
    };

    const paramsString = this.createParamsString(params);
    const requestHash = this.generateRequestHash(paramsString);

    const requestBody = {
      ...params,
      RequestHash: requestHash
    };

    try {
      const response = await axios.post(
        `${this.config.BASE_URL}/HS/api/Tran/DoTran`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data.success === 'true') {
        return {
          success: true,
          authToken: response.data.AuthToken,
          hashKey: response.data.HashKey,
          isOTP: response.data.IsOTP === 'true',
          transactionRef: response.data.TransactionReferenceNumber
        };
      } else {
        throw new Error(response.data.ErrorMessage || 'Transaction initiation failed');
      }
    } catch (error) {
      console.error('[APG] Transaction initiation error:', error.message);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  // Step 3: Process Transaction (with OTP)
  async processTransaction(authToken, orderData, otpData) {
    const params = {
      ChannelId: this.config.CHANNEL_ID,
      MerchantId: this.config.MERCHANT_ID,
      StoreId: this.config.STORE_ID,
      MerchantHash: this.config.MERCHANT_HASH,
      MerchantUsername: this.config.MERCHANT_USERNAME,
      MerchantPassword: this.config.MERCHANT_PASSWORD,
      ReturnURL: this.config.RETURN_URL,
      Currency: this.config.CURRENCY,
      AuthToken: authToken,
      TransactionTypeId: orderData.paymentMethodType,
      TransactionReferenceNumber: orderData.transactionRef,
      SMSOTAC: otpData.smsOTAC || '',
      EmailOTAC: otpData.emailOTAC || '',
      SMSOTP: otpData.smsOTP || '',
      HashKey: otpData.hashKey
    };

    const paramsString = this.createParamsString(params);
    const requestHash = this.generateRequestHash(paramsString);

    const requestBody = {
      ...params,
      RequestHash: requestHash
    };

    try {
      const response = await axios.post(
        `${this.config.BASE_URL}/HS/api/ProcessTran/ProTran`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      return {
        success: response.data.response_code === '00',
        transactionId: response.data.unique_tran_id,
        responseCode: response.data.response_code,
        description: response.data.description,
        transactionStatus: response.data.transaction_status,
        amount: response.data.transaction_amount,
        accountNumber: response.data.account_number,
        paidDateTime: response.data.paid_datetime
      };
    } catch (error) {
      console.error('[APG] Transaction processing error:', error.message);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  // Check payment status via IPN
  async checkPaymentStatus(transactionRef) {
    const ipnUrl = `${this.config.BASE_URL}/HS/api/IPN/OrderStatus/${this.config.MERCHANT_ID}/${this.config.STORE_ID}/${transactionRef}`;

    try {
      const response = await axios.get(ipnUrl, { timeout: 15000 });

      return {
        success: response.data.ResponseCode === '00',
        transactionStatus: response.data.TransactionStatus,
        transactionId: response.data.TransactionId,
        amount: response.data.TransactionAmount,
        responseCode: response.data.ResponseCode,
        description: response.data.Description,
        paidDateTime: response.data.TransactionDateTime
      };
    } catch (error) {
      console.error('[APG] Status check error:', error.message);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }
}

module.exports = new APGPaymentService();