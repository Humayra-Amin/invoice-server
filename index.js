const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ["http://localhost:5173","https://invoice-server-theta.vercel.app","https://invoice-client.web.app", "https://invoice-client.firebaseapp.com"],
    credentials: true,
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9jkswbp.mongodb.net/invoiceDB?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let invoicesCollection;

async function run() {
    try {
        await client.connect();
        const database = client.db("invoiceDB");
        invoicesCollection = database.collection("invoices");
        console.log("Connected to MongoDB!");
    } catch (err) {
        console.error(err);
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Invoice Server Started');
});

app.post('/api/invoices', async (req, res) => {
    const invoice = req.body;
    try {
        const result = await invoicesCollection.insertOne(invoice);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await invoicesCollection.find({}).toArray();
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/invoices/:id', async (req, res) => {
    const invoiceId = req.params.id;
    try {
        const invoice = await invoicesCollection.findOne({ _id: new ObjectId(invoiceId) });
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.status(200).json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API endpoint to generate and download PDF
app.get('/api/invoices/:id/pdf', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const invoice = await invoicesCollection.findOne({ _id: new ObjectId(invoiceId) });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Create a PDF document
        const doc = new PDFDocument();

        // Set headers to download the file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceDetails.invoiceNo}.pdf`);

        // Stream the PDF to the response
        doc.pipe(res);

        // Add content to the PDF document
        doc.fontSize(14).text(`Invoice No: ${invoice.invoiceDetails.invoiceNo}`, 100, 100);
        doc.text(`Invoice Date: ${invoice.invoiceDetails.invoiceDate}`, 100, 120);
        // Add more invoice details as needed...

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
