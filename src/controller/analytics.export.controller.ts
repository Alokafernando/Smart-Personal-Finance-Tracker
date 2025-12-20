import { Response } from "express";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import QuickChart from "quickchart-js";
import fetch from "node-fetch";
import { AuthRequest } from "../middleware/auth";
import { Transaction } from "../model/transaction.model";
import { Category } from "../model/category.model"; // import Category model

/* ================= COLORS ================= */
const COLORS = {
    primary: "#2563EB",
    secondary: "#F97316",
    grayText: "#374151",
    lightGray: "#E5E7EB",
    softGreen: "#DCFCE7",
    softRed: "#FEE2E2",
    softBlue: "#DBEAFE",
    softOrange: "#FFEDD5",
}

/* ================= SECTION TITLE ================= */
const sectionTitle = (doc: PDFKit.PDFDocument, title: string, y?: number) => {
    if (y) doc.y = y;
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.primary).text(title);
    doc
        .strokeColor(COLORS.lightGray)
        .lineWidth(1)
        .moveTo(50, doc.y + 5)
        .lineTo(doc.page.width - 50, doc.y + 5)
        .stroke();
    doc.moveDown(1);
};

/* ================= CONTROLLER ================= */
export const exportAnalyticsPDF = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.sub;
        const { month, year } = req.body;

        /* ================= FILTER ================= */
        const filter: any = { user_id: new mongoose.Types.ObjectId(userId) };
        if (month && year)
            filter.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0, 23, 59, 59) };
        else if (year)
            filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };

        const transactions = await Transaction.find(filter).sort({ date: -1 }).lean();

        /* ================= FETCH CATEGORIES ================= */
        const categories = await Category.find().select("_id name").lean();
        const categoryNameMap: Record<string, string> = {};
        categories.forEach(c => {
            categoryNameMap[c._id.toString()] = c.name;
        });

        /* ================= SUMMARY ================= */
        const income = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
        const balance = income - expense;
        const savingsRate = income ? (balance / income) * 100 : 0;

        /* ================= CATEGORY MAP ================= */
        const categoryMap: Record<string, { income: number; expense: number }> = {};

        transactions.forEach(t => {
            // Get category name from category_id
            const catName = t.category_id ? categoryNameMap[t.category_id.toString()] || "Other" : "Other";

            if (!categoryMap[catName]) categoryMap[catName] = { income: 0, expense: 0 };

            if (t.type === "INCOME") categoryMap[catName].income += t.amount;
            else categoryMap[catName].expense += t.amount;
        });

        /* ================= CHART DATA ================= */
        const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const incomeArr = Array(12).fill(0);
        const expenseArr = Array(12).fill(0);

        transactions.forEach(t => {
            const m = new Date(t.date).getMonth();
            if (t.type === "INCOME") incomeArr[m] += t.amount;
            else expenseArr[m] += t.amount;
        });

        /* -------------------- Bar Chart -------------------- */
        const barChart = new QuickChart()
            .setConfig({
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        { label: "Income", data: incomeArr, backgroundColor: "#22C55E" },
                        { label: "Expense", data: expenseArr, backgroundColor: "#EF4444" }
                    ]
                },
                options: { plugins: { legend: { position: "bottom" } } }
            })
            .setWidth(800)
            .setHeight(300);

        const barBuffer = Buffer.from(
            await (await fetch(await barChart.getShortUrl())).arrayBuffer()
        );

        /* -------------------- Pie Chart -------------------- */
        const pieChart = new QuickChart()
            .setConfig({
                type: "pie",
                data: {
                    labels: Object.keys(categoryMap),
                    datasets: [{
                        data: Object.values(categoryMap).map(c => c.expense),
                        backgroundColor: ["#FDBA74", "#F97316", "#FB923C", "#FED7AA", "#FCA5A5", "#FCD34D"]
                    }]
                },
                options: { plugins: { legend: { position: "right" } } }
            })
            .setWidth(400)
            .setHeight(280);

        const pieBuffer = Buffer.from(
            await (await fetch(await pieChart.getShortUrl())).arrayBuffer()
        );

        /* ================= PDF INIT ================= */
        const doc = new PDFDocument({ size: "A4", margins: { top: 60, bottom: 50, left: 50, right: 50 } });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=finance-report.pdf");
        doc.pipe(res);

        /* ================= HEADER ================= */
        doc.fontSize(20).font("Helvetica-Bold").fillColor(COLORS.primary)
            .text("Smart Finance Tracker", { align: "center" });

        doc.fontSize(10).fillColor(COLORS.grayText)
            .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });

        // ================= PAGE 1: SUMMARY + BAR CHART =================
        sectionTitle(doc, "Financial Summary");

        // Cards
        const cards = [
            { label: "Income", value: income, bg: COLORS.softGreen },
            { label: "Expense", value: expense, bg: COLORS.softRed },
            { label: "Balance", value: balance, bg: COLORS.softBlue },
            { label: "Savings Rate", value: `${savingsRate.toFixed(1)}%`, bg: COLORS.softOrange },
        ];

        let x = 50;
        const y = doc.y;

        cards.forEach(c => {
            doc.roundedRect(x, y, 120, 60, 8).fill(c.bg);
            doc.fillColor(COLORS.grayText).fontSize(11).font("Helvetica-Bold")
                .text(c.label, x + 10, y + 10);
            doc.fontSize(14).text(`Rs ${c.value}`, x + 10, y + 32);
            x += 130;
        });

        doc.moveDown(5);

        // Monthly Income vs Expense Chart
        const titleX = 50;
        const titleY = doc.y;
        doc.font("Helvetica-Bold").fontSize(16).fillColor(COLORS.primary)
            .text("Monthly Income vs Expense", titleX, titleY, { align: "left" });

        const chartHeight = 220;
        const chartX = 50;
        const chartWidth = doc.page.width - 100;
        const chartY = titleY + 25;

        doc.image(barBuffer, chartX, chartY, { width: chartWidth, height: chartHeight });
        doc.y = chartY + chartHeight + 20;

        // ================= PAGE 2: PIE CHART + CATEGORY SUMMARY =================
        doc.addPage();
        sectionTitle(doc, "Category-wise Expenses");

        // Filter categories with non-zero expense
        const filteredCategories = Object.entries(categoryMap).filter(([_, data]) => data.expense > 0);
        let tableY = doc.y;

        if (filteredCategories.length > 0) {
            // Pie chart
            const pieChart = new QuickChart()
                .setConfig({
                    type: "pie",
                    data: {
                        labels: filteredCategories.map(([cat]) => cat),
                        datasets: [{
                            data: filteredCategories.map(([_, data]) => data.expense),
                            backgroundColor: ["#FDBA74", "#F97316", "#FB923C", "#FED7AA", "#FCA5A5", "#FCD34D"]
                        }]
                    },
                    options: { plugins: { legend: { position: "right" } } }
                })
                .setWidth(400)
                .setHeight(280);

            const pieBuffer = Buffer.from(await (await fetch(await pieChart.getShortUrl())).arrayBuffer());

            const pieWidth = 400;
            const pieHeight = 280;
            const pieX = (doc.page.width - pieWidth) / 2;
            const pieY = doc.y + 10;
            doc.image(pieBuffer, pieX, pieY, { width: pieWidth, height: pieHeight });
            doc.y = pieY + pieHeight + 20;

            // Table below pie chart
            sectionTitle(doc, "Category Expense Summary");
            doc.y += 10;

            let tableY = doc.y;
            const headers = ["Category", "Total Expense"];
            const colWidths = [250, 120];
            const tableWidth = colWidths.reduce((a, b) => a + b, 0);
            const tableX = (doc.page.width - tableWidth) / 2;

            // Header row
            let hx = tableX;
            headers.forEach((h, i) => {
                doc.rect(hx, tableY, colWidths[i], 24).fill(COLORS.primary);
                doc.fillColor("white").fontSize(10).text(h, hx + 5, tableY + 7);
                hx += colWidths[i];
            });
            tableY += 24;

            // Table rows
            filteredCategories.forEach(([cat, data], i) => {
                let cx = tableX;
                const bgColor = i % 2 === 0 ? COLORS.softBlue : "white";

                [cat, `Rs ${data.expense.toLocaleString()}`].forEach((txt, idx) => {
                    doc.rect(cx, tableY, colWidths[idx], 22).fill(bgColor).stroke(COLORS.lightGray);
                    doc.fillColor(COLORS.grayText).fontSize(9).text(txt, cx + 5, tableY + 6);
                    cx += colWidths[idx];
                });

                tableY += 22;
                if (tableY > doc.page.height - 80) {
                    doc.addPage();
                    tableY = 50;
                }
            });
        } else {
            doc.fontSize(12).fillColor(COLORS.grayText).text("No expenses to display.", { align: "center" });
        }


        // ================= PAGE 3+: ALL TRANSACTIONS =================
        doc.addPage();
        sectionTitle(doc, "All Transactions");

        tableY = doc.y;
        const allHeaders = ["Date", "Type", "Category", "Amount"];
        const allWidths = [100, 80, 180, 100];

        const drawHeader = () => {
            let x = 50;
            allHeaders.forEach((h, i) => {
                doc.rect(x, tableY, allWidths[i], 24).fill(COLORS.primary);
                doc.fillColor("white").fontSize(10).text(h, x + 5, tableY + 7);
                x += allWidths[i];
            });
            tableY += 24;
        };

        drawHeader();

        transactions.forEach((t, i) => {
            if (tableY > doc.page.height - 80) {
                doc.addPage();
                tableY = 50;
                drawHeader();
            }

            const categoryName = t.category_id ? categoryNameMap[t.category_id.toString()] || "Other" : "Other";

            let x = 50;
            [t.date.toISOString().slice(0, 10), t.type, categoryName, `Rs ${t.amount}`].forEach((txt, idx) => {
                doc.rect(x, tableY, allWidths[idx], 22)
                    .fill(i % 2 === 0 ? COLORS.softBlue : "white")
                    .stroke(COLORS.lightGray);
                doc.fillColor(COLORS.grayText).fontSize(9).text(txt, x + 5, tableY + 6);
                x += allWidths[idx];
            });

            tableY += 22;
        });

        /* ================= FOOTER ================= */
        doc.on("pageAdded", () => {
            doc.fontSize(9).fillColor("#6B7280")
                .text("Smart Finance Tracker ©", 0, doc.page.height - 40, { align: "center" });
        });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "PDF generation failed", err });
    }
};

export const getBalanceTrend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.sub;

    const transactions = await Transaction.find({ user_id: userId }).sort({ date: 1 });

    const monthlyIncome = Array(12).fill(0);
    const monthlyExpense = Array(12).fill(0);

    transactions.forEach(t => {
      const month = new Date(t.date).getMonth(); 
      if (t.type === "INCOME") monthlyIncome[month] += t.amount;
      else if (t.type === "EXPENSE") monthlyExpense[month] += t.amount;
    });

    const data = monthlyIncome.map((income, i) => ({
      month: i + 1,
      income,
      expense: monthlyExpense[i],
      balance: income - monthlyExpense[i], 
    }));

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

