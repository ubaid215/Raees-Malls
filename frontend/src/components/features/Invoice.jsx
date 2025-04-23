import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Invoice = ({ order }) => {
  const generatePDF = () => {
    const doc = new jsPDF();

    // Verify autoTable is available
    if (!autoTable) {
      console.error('jspdf-autotable is not loaded');
      throw new Error('jspdf-autotable plugin is not loaded');
    }

    // Header: Brand Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Red color for branding
    doc.text('Raees Malls', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Invoice', 105, 30, { align: 'center' });

    // Order Details
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.id}`, 20, 50);
    doc.text(`Date: ${order.date}`, 20, 57);
    doc.text(`Total Amount: ${order.total}`, 20, 64);

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${order.customer.name}`, 20, 90);
    doc.text(
      `Address: ${order.customer.address}, ${order.customer.city}, ${order.customer.postalCode}, ${order.customer.country}`,
      20,
      97,
      { maxWidth: 170 }
    );
    doc.text(
      `Payment Method: ${order.customer.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit/Debit Card'}`,
      20,
      111
    );

    // Items Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Items', 20, 130);
    doc.setFont('helvetica', 'normal');

    const tableData = order.items.map((item) => [
      item.name,
      item.quantity || 1, // Fallback to 1 if quantity is missing
      item.price,
      item.access,
    ]);

    autoTable(doc, {
      startY: 135,
      head: [['Item Name', 'Quantity', 'Price', 'Access']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [200, 0, 0], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
      },
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text('Thank you for shopping with Raees Malls!', 105, finalY, {
      align: 'center',
    });
    doc.text('Contact: support@raeesmalls.com | +923006530063', 105, finalY + 7, {
      align: 'center',
    });

    // Save PDF
    doc.save(`invoice-${order.id}.pdf`);
  };

  return { generatePDF };
};

export default Invoice;