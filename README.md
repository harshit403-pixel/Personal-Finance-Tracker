# 💰 Personal Finance Tracker

A **full-stack web application** that enables users to securely manage their income, expenses, and savings while visualizing insights through interactive charts. It helps track transactions, monitor budgets, and generate financial reports — all from a modern, responsive dashboard.

---

## 🚀 Features

- **User Authentication (JWT):** Secure login/signup with encrypted passwords using bcrypt.  
- **Transaction Management:** Add, edit, and delete income or expense records.  
- **Categorization:** Classify transactions (🍔 Food, 🚗 Transport, 🎬 Entertainment, 💰 Salary, etc.).  
- **Analytics Dashboard:**  
  - Monthly balance trend (Bar Chart)  
  - Category-wise expense breakdown (Pie Chart)  
  - Insights summary with total transactions, spending, and savings  
- **Savings Goal Tracker:**  
  - Define your goal amount  
  - Dynamic progress visualization  
  - Goal completion notifications  
- **Dark / Light Mode Toggle**  
- **PDF & Email Reports:**  
  - Export dashboard as a PDF (jsPDF + html2canvas)  
  - Auto-email monthly reports using Nodemailer  
- **Responsive Design:**  
  Works seamlessly across desktop and mobile devices.  

---

## 🧰 Tech Stack

**Frontend:**  
- HTML5, CSS3, JavaScript  
- Chart.js for data visualization  

**Backend:**  
- Node.js + Express.js  
- MongoDB with Mongoose  
- JWT + bcrypt for authentication  
- Nodemailer for sending reports  

**Other Tools:**  
- jsPDF, html2canvas for report generation  
- Toast notifications for better UI feedback  

---

## 🗂️ Folder Structure

Personal-Finance-Tracker/
│
├── server.js
├── .env
├── package.json
│
├── /models/
│ ├── usermodel.js
│ ├── transaction.js
│
├── /public/
│ ├── index.html
│ ├── dashboard.html
│ ├── login.html
│ ├── sign-up.html
│ ├── style.css
│ ├── dark.css
│ ├── dashboard.css
│ ├── script.js
│
└── /assets/
├── icons/
└── images/

---

## ⚙️ Installation Guide

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker

2️⃣ Install Dependencies
bash
Copy code
npm install

3️⃣ Configure Environment Variables
Create a .env file in the root directory and add:


PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password

4️⃣ Run the Server

node server.js


http://localhost:3000

🌐 Deployment
Frontend Hosting:

Netlify

Vercel

GitHub Pages

Backend Hosting:

Render

Railway

Cyclic

Database:

MongoDB Atlas

After deployment, update the frontend script.js to point to your live backend API URL.

🧾 Future Enhancements
Monthly expense limit alerts

Multi-currency support

Improved animations for charts

Export reports as CSV

🧑‍💻 Author
Developed by: Harshit Raghuwanshi
Location: Bhopal, India

🪪 License
This project is licensed under the MIT License.
You are free to use, modify, and distribute this software with attribution.

