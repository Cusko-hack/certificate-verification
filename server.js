require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const session = require("express-session");
const PDFDocument = require("pdfkit");
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

async function generateCertificateNumber() {
    const year = new Date().getFullYear();

    while (true) {
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const certificateNumber = `LIA-${year}-${randomNumber}`;

        const result = await pool.query(
            "SELECT id FROM \"LIA certificate verification\" WHERE certificate_number = $1",
            [certificateNumber]
        );

        if (result.rows.length === 0) {
            return certificateNumber;
        }
    }
}
async function createCertificate(name, course, startDate, endDate) {
    const certificateNumber = await generateCertificateNumber();

    const result = await pool.query(
        `INSERT INTO "LIA certificate verification"
        (certificate_number, name, "course/programme", "programme_start_date", "Date_issued")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
            certificateNumber,
            name,
            course,
            startDate,
            endDate
        ]
    );

    return result.rows[0];
}

pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Database connected successfully!");
    }
});

const app = express();
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
}
}));
app.post("/admin/create-certificate", requireAdmin, async (req, res) => {
    try {
        const { name, course, startDate, endDate } = req.body;

        const certificate = await createCertificate(
            name,
            course,
            startDate,
            endDate
        );

        res.json({
            success: true,
            certificate: certificate
        });

    } catch (error) {
        console.error("Certificate creation failed:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create certificate."
        });
    }
});
app.post("/admin/create-certificate", async (req, res) => {
    try {
        const { name, course, startDate, endDate } = req.body;

        const certificate = await createCertificate(
            name,
            course,
            startDate,
            endDate
        );

        res.json({
            success: true,
            certificate: certificate
        });

    } catch (error) {
        console.error("Certificate creation failed:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create certificate."
        });
    }
});
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});
app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.redirect("/login");
    });

});
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        req.session.isAdmin = true;

        return res.json({
            success: true
        });
    }

    res.json({
        success: false
    });
});
function requireAdmin(req, res, next) {

    if (!req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    next();
}
app.get("/admin", requireAdmin, (req, res) => {

    if (!req.session.isAdmin) {
        return res.redirect("/login");
    }

    res.sendFile(__dirname + "/admin.html");
});
app.get("/admin/certificates", requireAdmin, (req, res) => {
    res.sendFile(__dirname + "/certificates.html");
});
app.get("/admin/certificates-data", requireAdmin, async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                id,
                certificate_number,
                name,
                "course/programme",
                programme_start_date,
                "Date_issued"
             FROM "LIA certificate verification"
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            certificates: result.rows
        });

    } catch (error) {

        console.error("Failed to load certificates:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load certificates."
        });

    }

});
const PORT = 3000;

// Sample certificate
const certificates = [
    {
    certificateNumber: "CERT-2026-3219",
    name: "Atsaga Rejoice",
    course: "Public speaking and mastery class",
    dateIssued: "September 2, 2026"
    },
    {
    certificateNumber: "CERT-2026-3211",
    name: "Aminu",
    course: "Public speaking and mastery class",
    dateIssued: "September 2, 2026"
    },
    {
        certificateNumber: "CERT-2026-1432",
        name: "Ajaja Olusanya",
        course: "Advanced Women in Leadership",
        dateIssued: "September 5, 2026"
    },
    {
        certificateNumber: "CERT-2026-1411",
        name: "Okhai Peterson",
        course: "Public speaking",
        dateIssued: "August 23, 2019"
    }
];


// Homepage
// ===============================
// MAIN VERIFICATION PAGE
// ===============================

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>Certificate Verification | Leadership & Innovation Academy</title>

            <style>

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                body {
                    font-family: Arial, Helvetica, sans-serif;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #f4f8f5, #e8f1eb);
                    color: #17251c;
                    display: flex;
                    flex-direction: column;
                }

                /* HEADER */

                header {
                    width: 100%;
                    padding: 25px 7%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.9);
                    border-bottom: 1px solid #e2e8e4;
                }

                .logo {
                    font-size: 20px;
                    font-weight: 700;
                    color: #176b3a;
                    letter-spacing: 0.5px;
                }

                .logo span {
                    display: block;
                    font-size: 11px;
                    color: #777;
                    font-weight: normal;
                    margin-top: 3px;
                    letter-spacing: 1px;
                }

                nav a {
                    text-decoration: none;
                    color: #555;
                    font-size: 14px;
                    margin-left: 25px;
                }

                nav a:hover {
                    color: #176b3a;
                }

                /* MAIN */

                main {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 60px 20px;
                }

                .verification-card {
                    width: 100%;
                    max-width: 620px;
                    background: white;
                    padding: 55px 50px;
                    border-radius: 20px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
                }

                .icon {
                    width: 70px;
                    height: 70px;
                    margin: 0 auto 25px;
                    border-radius: 50%;
                    background: #e8f6ed;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 32px;
                }

                h1 {
                    font-size: 36px;
                    margin-bottom: 15px;
                    color: #17251c;
                }

                .description {
                    color: #6b756f;
                    line-height: 1.7;
                    font-size: 16px;
                    max-width: 470px;
                    margin: 0 auto 35px;
                }

                /* FORM */

                form {
                    width: 100%;
                }

                .input-wrapper {
                    text-align: left;
                    margin-bottom: 18px;
                }

                label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #4d5851;
                    margin-bottom: 8px;
                }

                input {
                    width: 100%;
                    padding: 17px 18px;
                    border: 1px solid #d6ded9;
                    border-radius: 10px;
                    font-size: 16px;
                    outline: none;
                    transition: 0.2s;
                }

                input:focus {
                    border-color: #176b3a;
                    box-shadow: 0 0 0 3px rgba(23, 107, 58, 0.1);
                }

                button {
                    width: 100%;
                    padding: 17px;
                    border: none;
                    border-radius: 10px;
                    background: #176b3a;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                }

                button:hover {
                    background: #11552e;
                    transform: translateY(-1px);
                }

                /* TRUST ITEMS */

                .trust-section {
                    display: flex;
                    justify-content: center;
                    gap: 25px;
                    margin-top: 35px;
                    padding-top: 25px;
                    border-top: 1px solid #edf0ee;
                    color: #777;
                    font-size: 12px;
                }

                .trust-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .check {
                    color: #176b3a;
                    font-weight: bold;
                }

                /* FOOTER */

                footer {
                    text-align: center;
                    padding: 25px;
                    color: #7a837d;
                    font-size: 12px;
                }

                /* MOBILE */

                @media (max-width: 600px) {

                    header {
                        padding: 20px;
                    }

                    nav {
                        display: none;
                    }

                    main {
                        padding: 30px 15px;
                    }

                    .verification-card {
                        padding: 40px 25px;
                    }

                    h1 {
                        font-size: 28px;
                    }

                    .description {
                        font-size: 14px;
                    }

                    .trust-section {
                        flex-direction: column;
                        gap: 12px;
                    }

                }

            </style>
        </head>

        <body>

            <header>

                <div class="logo">
                    LEADERSHIP & INNOVATION ACADEMY
                    <span>OFFICIAL CERTIFICATE VERIFICATION</span>
                </div>

                <nav>
                    <a href="/">Verification</a>
                </nav>

            </header>


            <main>

                <div class="verification-card">

                    <div class="icon">
                        ✓
                    </div>

                    <h1>
                        Certificate Verification
                    </h1>

                    <p class="description">
                        Verify the authenticity of a certificate
                        issued by Leadership & Innovation Academy.
                        Enter the certificate number below to
                        view the official certificate record.
                    </p>


                    <form action="/verify" method="GET">

                        <div class="input-wrapper">

                            <label for="certificateNumber">
                                Certificate Number
                            </label>

                            <input
                                type="text"
                                id="certificateNumber"
                                name="certificateNumber"
                                placeholder="e.g. CERT-2026-0001"
                                required
                                autocomplete="off"
                            >

                        </div>

                        <button type="submit">
                            Verify Certificate
                        </button>

                    </form>


                    <div class="trust-section">

                        <div class="trust-item">
                            <span class="check">✓</span>
                            Secure Verification
                        </div>

                        <div class="trust-item">
                            <span class="check">✓</span>
                            Official Records
                        </div>

                        <div class="trust-item">
                            <span class="check">✓</span>
                            Instant Results
                        </div>

                    </div>

                </div>

            </main>


            <footer>

                © 2026 Leadership & Innovation Academy LTD.
                All rights reserved.

            </footer>

        </body>

        </html>
    `);
});

// Certificate verification
app.get("/verify", async (req, res) => {

    const certificateNumber = req.query.certificateNumber;

    const result = await pool.query(
    `SELECT * FROM "LIA certificate verification"
     WHERE certificate_number = $1`,
    [certificateNumber]
);

const certificate = result.rows[0];

    if (certificate) {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">

            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Certificate Verified | Leadership & Innovation Academy</title>

                <style>

                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }

                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        min-height: 100vh;
                        background: linear-gradient(135deg, #f4f8f5, #e8f1eb);
                        color: #17251c;
                        display: flex;
                        flex-direction: column;
                    }

                    header {
                        padding: 25px 7%;
                        background: rgba(255,255,255,0.95);
                        border-bottom: 1px solid #e2e8e4;
                    }

                    .logo {
                        font-size: 20px;
                        font-weight: 700;
                        color: #176b3a;
                    }

                    .logo span {
                        display: block;
                        font-size: 11px;
                        color: #777;
                        font-weight: normal;
                        margin-top: 4px;
                        letter-spacing: 1px;
                    }

                    main {
                        flex: 1;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 50px 20px;
                    }

                    .card {
                        width: 100%;
                        max-width: 650px;
                        background: white;
                        padding: 45px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.08);
                    }

                    .verified-badge {
                        display: inline-block;
                        background: #e8f7ed;
                        color: #176b3a;
                        padding: 10px 18px;
                        border-radius: 50px;
                        font-size: 13px;
                        font-weight: bold;
                    }

                    h1 {
                        margin-top: 20px;
                        font-size: 34px;
                    }

                    .intro {
                        margin-top: 10px;
                        color: #6b756f;
                        line-height: 1.7;
                    }

                    .details {
                        margin-top: 30px;
                        border: 1px solid #e5ebe7;
                        border-radius: 14px;
                        overflow: hidden;
                    }

                    .row {
                        padding: 18px 20px;
                        border-bottom: 1px solid #edf0ee;
                    }

                    .row:last-child {
                        border-bottom: none;
                    }

                    .label {
                        font-size: 12px;
                        color: #7a837d;
                        text-transform: uppercase;
                        letter-spacing: 0.7px;
                    }

                    .value {
                        margin-top: 6px;
                        font-size: 17px;
                        font-weight: 700;
                    }

                    .valid-message {
                        margin-top: 25px;
                        background: #e8f7ed;
                        color: #176b3a;
                        padding: 16px;
                        border-radius: 10px;
                        text-align: center;
                        font-weight: 600;
                    }

                    .back-button {
                        display: block;
                        text-align: center;
                        margin-top: 25px;
                        padding: 15px;
                        background: #176b3a;
                        color: white;
                        text-decoration: none;
                        border-radius: 10px;
                        font-weight: 600;
                    }

                    .back-button:hover {
                        background: #11552e;
                    }

                    footer {
                        text-align: center;
                        padding: 25px;
                        color: #7a837d;
                        font-size: 12px;
                    }

                    @media (max-width: 600px) {

                        .card {
                            padding: 30px 22px;
                        }

                        h1 {
                            font-size: 27px;
                        }

                        main {
                            padding: 30px 15px;
                        }

                    }

                </style>

            </head>

            <body>

                <header>

                    <div class="logo">

                        LEADERSHIP & INNOVATION ACADEMY

                        <span>
                            OFFICIAL CERTIFICATE VERIFICATION
                        </span>

                    </div>

                </header>


                <main>

                    <div class="card">

                        <div class="verified-badge">
                            ✓ VERIFIED
                        </div>

                        <h1>
                            Certificate Verified
                        </h1>

                        <p class="intro">
                            This certificate has been successfully verified
                            against the official records of Leadership &
                            Innovation Academy.
                        </p>


                        <div class="details">

                            <div class="row">

                                <div class="label">
                                    Certificate Number
                                </div>

                                <div class="value">
                                    ${certificate.certificate_number}
                                </div>

                            </div>


                            <div class="row">

                                <div class="label">
                                    Awarded To
                                </div>

                                <div class="value">
                                    ${certificate.name}
                                </div>

                            </div>


                            <div class="row">

                                <div class="label">
                                    Programme
                                </div>

                                <div class="value">
                                    ${certificate["course/programme"]}
                                </div>

                            </div>


                            <div class="row">

                                <div class="label">
                                    Date Issued
                                </div>

                                <div class="value">
                                    ${new Date(certificate.Date_issued).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
})}
                                </div>

                            </div>

                        </div>


                        <div class="valid-message">

                            ✓ This certificate is authentic and valid.

                        </div>


                        <a href="/" class="back-button">
                            Verify Another Certificate
                        </a>

                    </div>

                </main>


                <footer>

                    © 2026 Leadership & Innovation Academy LTD.
                    All rights reserved.

                </footer>

            </body>

            </html>
        `);

    } else {

        res.send(`
            <!DOCTYPE html>

            <html>

            <head>

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Certificate Not Found</title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        background: #f4f8f5;
                        text-align: center;
                        padding: 80px 20px;
                    }

                    .card {
                        max-width: 550px;
                        margin: auto;
                        background: white;
                        padding: 45px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.08);
                    }

                    h1 {
                        color: #b42318;
                    }

                    p {
                        color: #666;
                        margin: 15px 0 25px;
                    }

                    a {
                        display: inline-block;
                        padding: 14px 25px;
                        background: #176b3a;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                    }

                </style>

            </head>

            <body>

                <div class="card">

                    <h1>
                        ✕ Certificate Not Found
                    </h1>

                    <p>
                        We could not find a certificate with the
                        number you entered.
                    </p>

                    <a href="/">
                        Try Again
                    </a>

                </div>

            </body>

            </html>
        `);
    }

});
app.get("/qrcode/:certificateNumber", async (req, res) => {

    const certificateNumber = req.params.certificateNumber;

    const result = await pool.query(
    `SELECT * FROM "LIA certificate verification"
     WHERE certificate_number = $1`,
    [certificateNumber]
);

const certificate = result.rows[0];

    if (!certificate) {
        return res.send(`
            <h1>Certificate Not Found</h1>
            <p>No certificate exists with number: ${certificateNumber}</p>
        `);
    }

    const QRCode = require("qrcode");

    const verificationURL =
    `https://certificate-verification-m7bw.onrender.com/verify?certificateNumber=${certificateNumber}`;

    try {

        const qrCode = await QRCode.toDataURL(verificationURL);

        res.send(`
            <!DOCTYPE html>
            <html>

            <head>
                <title>Certificate QR Code</title>
            </head>

            <body style="
                text-align:center;
                font-family:Arial;
                padding:50px;
            ">

                <h1>Certificate QR Code</h1>

                <h2>${certificate.name}</h2>

                <p>
                    Certificate Number:
                    <strong>${certificate.certificate_number}</strong>
                </p>

                <img
                    src="${qrCode}"
                    alt="Certificate QR Code"
                    width="300"
                >
            <a
                <a
                    href="/qrcode-pdf/${certificate.certificate_number}"
                style="
                    display:inline-block;
                    margin-top:20px;
                    padding:12px 20px;
                    background:#0b6b3a;
                    color:white;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:bold;
                "
            >
                Download QR Code
            </a>

                <p>
                    Scan this QR code to verify the certificate.
                </p>

            </body>

            </html>
        `);

    } catch (error) {

        res.status(500).send(
            "Unable to generate QR code."
        );

    }

});
app.get("/qrcode-pdf/:certificateNumber", async (req, res) => {

    try {

        const certificateNumber = req.params.certificateNumber;

        const result = await pool.query(
            `SELECT * FROM "LIA certificate verification"
             WHERE certificate_number = $1`,
            [certificateNumber]
        );

        const certificate = result.rows[0];

        if (!certificate) {
            return res.status(404).send("Certificate not found.");
        }

        const QRCode = require("qrcode");

        const verificationURL =
            `https://certificate-verification-m7bw.onrender.com/verify?certificateNumber=${certificateNumber}`;

        const qrBuffer = await QRCode.toBuffer(verificationURL, {
            type: "png",
            width: 500,
            margin: 2
        });

        const doc = new PDFDocument({
            size: "A4",
            margin: 50
        });

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${certificateNumber}-QR.pdf"`
        );

        doc.pipe(res);

        doc
            .fontSize(22)
            .text(
                "Leadership & Innovation Academy",
                {
                    align: "center"
                }
            );

        doc.moveDown();

        doc
            .fontSize(16)
            .text(
                "Certificate Verification QR Code",
                {
                    align: "center"
                }
            );

        doc.moveDown(2);

        doc
            .fontSize(14)
            .text(
                `Recipient: ${certificate.name}`,
                {
                    align: "center"
                }
            );

        doc.moveDown();

        doc
            .fontSize(14)
            .text(
                `Certificate Number: ${certificate.certificate_number}`,
                {
                    align: "center"
                }
            );

        doc.moveDown(2);

        doc.image(
            qrBuffer,
            155,
            260,
            {
                width: 300
            }
        );

        doc.moveDown(18);

        doc
            .fontSize(12)
            .text(
                "Scan this QR code to verify this certificate.",
                {
                    align: "center"
                }
            );

        doc.end();

    } catch (error) {

        console.error(
            "QR PDF generation failed:",
            error
        );

        res.status(500).send(
            "Unable to generate QR PDF."
        );

    }

});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});