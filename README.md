# ShopNest – E-Commerce Shopping Management System

## Requirements
- Node.js (LTS recommended)
- Visual Studio Code
- Internet connection for Google Fonts and product photos

## Run in VS Code
1. Extract `ecommerce-shopping-management.zip`.
2. Open VS Code → File → Open Folder → choose `ecommerce-shopping-management`.
3. Open Terminal → New Terminal.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open your browser and visit: http://localhost:3000

Keep the terminal running while using the website. Press `Ctrl + C` to stop it.

## Admin login
- Email: `admin@shopnest.com`
- Password: `Admin@123`

After logging in as admin, click the account name and use the product/order management screens. Customers can register, add products to the cart, checkout, and view their own orders.

## Project folders
- `server.js` – Express backend and API routes
- `package.json` – Node.js dependencies and commands
- `data/db.json` – demo data storage (users, products, orders)
- `public/index.html` – website structure
- `public/style.css` – colours, layout and responsive design
- `public/app.js` – frontend logic and API connection

## Notes
This is a college/demo project. It uses a JSON file and Express's in-memory session store for simplicity. Do not use this setup for a real public store. For production, use a database, persistent session storage, HTTPS, CSRF protection, stronger validation, and a payment provider. Product images are loaded from Unsplash URLs and need internet access.
