const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB...'.yellow);

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`\n✅ ${colors.green('MongoDB Connected:')} ${colors.cyan.underline(conn.connection.host)}\n`.bold);
    console.log(`Database Name: ${colors.blue(conn.connection.name)}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB'.green);
    });

    mongoose.connection.on('error', (err) => {
      console.log('Mongoose connection error:'.red, err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected'.yellow);
    });

    // Close connection on process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(colors.red('Mongoose default connection disconnected through app termination'));
      process.exit(0);
    });

    return conn;
  } catch (err) {
    console.error(`\n❌ ${colors.red('MongoDB Connection Error:')} ${colors.red.bold(err.message)}\n`);
    process.exit(1);
  }
};

module.exports = connectDB;