# Trust M — ready to upload

This folder is the complete static site. Upload its **contents** to the root of the Trust-M GitHub repository; the connected Vercel project can then build it as a static site. The entry page is `index.html`. Open `finance.html` for the financial workspace and `amr.html` for Amr's compact overview.

The financial workspace includes a **مستندات المصروف PDF** tab. Register real supplier names in five categories, enter line items, optionally link a recorded expense, then save and open the A4 document. In the document window, choose **طباعة / حفظ PDF**. These are clearly marked internal expense documents, not supplier-issued or tax invoices. Actual supplier PDFs/photos belong in the separate invoice archive. Preparing an internal document does not post an additional expense or payment.

This upload package contains only mock project data. It deliberately excludes the original Ahmed workbook, its extracted JavaScript data, local source files, and the example quotation PDF. Browser records and attachments are stored locally in IndexedDB on each device; there is no shared database, login, or server-side permission enforcement yet. Amr's page hides financial editing actions in the demo, but real access control requires authenticated roles and database policies before production use.

If the GitHub repository already contains `source-workbook-data.js`, `source-import.js`, `source-workbook.js`, or `local-source/`, delete them from the repository before redeploying. Uploading this folder alone does not delete old files from an existing repository or its commit history.

No build command is needed. For a local preview, serve the folder with any static file server and open `index.html`.
