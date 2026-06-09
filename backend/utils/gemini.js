import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error(
        "⚠️ WARNING: GEMINI_API_KEY is not set. AI features will not work."
    );
}

const ai = new GoogleGenAI({ apiKey });

const stripMarkdown = (content = "") => {
    let cleaned = content.trim();

    if (cleaned.startsWith("```json")) {
        cleaned = cleaned
            .replace(/^```json\s*/i, "")
            .replace(/\s*```$/i, "");
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "");
    }

    return cleaned.trim();
};

const generateJsonResponse = async (prompt) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    const cleaned = stripMarkdown(response.text);

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Invalid JSON returned by Gemini:", cleaned);
        throw new Error("AI returned an invalid response format.");
    }
};

export const generateMonthlyInsight = async ({
    totalIncome,
    totalExpenses,
    savingsRate,
    expenseBreakdown = [],
    previousMonths = [],
    currency = "INR",
}) => {
    const breakdownText =
        expenseBreakdown.length > 0
            ? expenseBreakdown
                .map(
                    (item) =>
                        `- ${item.category}: ${currency} ${item.amount.toFixed(
                            2
                        )}`
                )
                .join("\n")
            : "- No expenses recorded.";

    const trendText =
        previousMonths.length > 0
            ? previousMonths
                .map(
                    (month) =>
                        `- ${month.month}: Income ${currency} ${month.income.toFixed(
                            2
                        )}, Expenses ${currency} ${month.expenses.toFixed(2)}`
                )
                .join("\n")
            : "- No previous month data available.";

    const estimatedSavings = totalIncome - totalExpenses;

    const prompt = `
Analyze the user's monthly financial data and generate actionable insights.

Currency: ${currency}
Total Income: ${currency} ${totalIncome.toFixed(2)}
Total Expenses: ${currency} ${totalExpenses.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%

Expense Breakdown:
${breakdownText}

Previous Month Trends:
${trendText}

Return ONLY valid JSON:

{
    "summary": "2-3 sentence financial summary",
    "highlights": ["highlight1", "highlight2"],
    "concerns": ["concern1", "concern2"],
    "recommendations": [
        {
            "title": "Recommendation title",
            "detail": "Actionable recommendation"
        }
    ],
    "topSpendingCategory": "Category name or null",
    "estimatedMonthlySavings": ${estimatedSavings},
    "healthScore": 0
}

Rules:
- healthScore must be an integer between 0 and 100.
- Provide exactly 3 recommendations.
- Reference actual financial numbers.
- Be practical, concise, and friendly.
`;

    try {
        return await generateJsonResponse(prompt);
    } catch (error) {
        console.error(
            "Gemini API error (monthly insight):",
            error
        );
        throw new Error("Failed to generate monthly insight.");
    }
};

export const generateBudgetAlert = async ({
    categoryName,
    budgetAmount,
    spentAmount,
    dayIntoPeriod,
    totalPeriodDays,
    currency = "INR",
}) => {
    const percentUsed = Number(
        ((spentAmount / budgetAmount) * 100).toFixed(1)
    );

    const daysLeft = totalPeriodDays - dayIntoPeriod;

    const prompt = `
A user is tracking a budget category.

Category: ${categoryName}
Budget: ${currency} ${budgetAmount.toFixed(2)}
Spent So Far: ${currency} ${spentAmount.toFixed(2)}
Budget Used: ${percentUsed}%
Days Passed: ${dayIntoPeriod}
Total Days: ${totalPeriodDays}
Days Remaining: ${daysLeft}

Return ONLY valid JSON:

{
    "severity": "info",
    "title": "Short alert title",
    "message": "1-2 sentence alert",
    "suggestions": [
        "Suggestion 1",
        "Suggestion 2",
        "Suggestion 3"
    ]
}

Severity Rules:
- info: below 70% spent
- warning: between 70% and 100% spent
- critical: above 100% spent

Reference actual numbers in the response.
`;

    try {
        return await generateJsonResponse(prompt);
    } catch (error) {
        console.error(
            "Gemini API error (budget alert):",
            error
        );
        throw new Error("Failed to generate budget alert.");
    }
};

export const generateSavingsTips = async ({
    topCategories = [],
    monthlyIncome,
    currency = "INR",
}) => {
    const categoryText =
        topCategories.length > 0
            ? topCategories
                .map(
                    (item) =>
                        `- ${item.category}: ${currency} ${item.amount.toFixed(
                            2
                        )} across ${item.transactionCount} transactions`
                )
                .join("\n")
            : "- No spending data available.";

    const prompt = `
Generate personalized savings tips.

Monthly Income:
${currency} ${monthlyIncome.toFixed(2)}

Top Spending Categories:
${categoryText}

Return ONLY valid JSON:

{
    "overallTip": "One sentence summary advice",
    "tips": [
        {
            "category": "Category Name",
            "title": "Tip title",
            "detail": "2-3 sentence actionable suggestion",
            "estimatedSavings": 0
        }
    ]
}

Rules:
- Provide exactly 4 tips.
- Use actual categories from the data.
- Include realistic estimated savings values.
- Keep suggestions practical and achievable.
`;

    try {
        return await generateJsonResponse(prompt);
    } catch (error) {
        console.error(
            "Gemini API error (savings tips):",
            error
        );
        throw new Error("Failed to generate savings tips.");
    }
};

export const analyzeTransactionList = async ({
    transactions = [],
    currency = "INR",
}) => {
    if (!transactions.length) {
        return {
            insight: "No transactions available for analysis.",
            highlight: "No Data",
        };
    }

    const formatDate = (value) => {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const totalIncome = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce(
            (sum, transaction) =>
                sum + Number(transaction.amount || 0),
            0
        );

    const totalExpenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce(
            (sum, transaction) =>
                sum + Number(transaction.amount || 0),
            0
        );

    const netAmount = totalIncome - totalExpenses;

    const lines = transactions
        .slice(0, 50)
        .map((transaction) => {
            const date = formatDate(
                transaction.transaction_date
            );

            const amount = Number(
                transaction.amount || 0
            ).toFixed(2);

            const category =
                transaction.category_name || "Uncategorized";

            const description = transaction.description
                ? ` | ${transaction.description}`
                : "";

            return `- ${date}: ${transaction.type} ${currency} ${amount} | ${category}${description}`;
        })
        .join("\n");

    const prompt = `
Analyze the following financial transactions.

Total Transactions: ${transactions.length}
Total Income: ${currency} ${totalIncome.toFixed(2)}
Total Expenses: ${currency} ${totalExpenses.toFixed(2)}
Net Savings: ${currency} ${netAmount.toFixed(2)}

Transactions:
${lines}

Return ONLY valid JSON:

{
    "insight": "2-4 sentence analysis using specific numbers and trends",
    "highlight": "Short key takeaway"
}

Rules:
- Reference actual numbers when relevant.
- Mention notable spending or income patterns.
- Keep the tone helpful and concise.
`;

    try {
        return await generateJsonResponse(prompt);
    } catch (error) {
        console.error(
            "Gemini API error (transaction analysis):",
            error
        );
        throw new Error(
            "Failed to generate transaction analysis."
        );
    }
};

export const analyzeBudgetList = async ({
    budgets = [],
    currency = "INR",
}) => {
    if (!budgets.length) {
        return {
            analyses: [],
        };
    }

    const lines = budgets
        .map((budget) => {
            const spent = Number(budget.spent || 0);
            const limit = Number(budget.amount || 0);

            const percentageUsed =
                limit > 0
                    ? ((spent / limit) * 100).toFixed(1)
                    : "0.0";

            return `Budget ID: ${budget.id}
Category: ${budget.category_name}
Budget Limit: ${currency} ${limit.toFixed(2)}
Spent: ${currency} ${spent.toFixed(2)}
Used: ${percentageUsed}%`;
        })
        .join("\n\n");

    const prompt = `
You are a personal finance assistant.

Today's Date: ${new Date().toISOString().split("T")[0]}

Analyze each budget and provide a short, personalized assessment.

Budgets:
${lines}

Return ONLY valid JSON (no markdown):

{
  "analyses": [
    {
      "budgetId": 1,
      "status": "good",
      "message": "You have used 45% of your Food budget and are on track for the month."
    }
  ]
}

Rules:
- Return exactly one analysis for each budget ID.
- Status must be:
  - "good" if usage is below 70%
  - "caution" if usage is between 70% and 100%
  - "concerning" if usage exceeds 100%
- Mention the actual percentage or spending figures.
- Keep each message to one sentence.
- Be friendly, practical, and actionable.
- Do not include any text outside the JSON response.
`;

    try {
        return await generateJsonResponse(prompt);
    } catch (error) {
        console.error(
            "Gemini API error (budget analysis):",
            error
        );

        throw new Error(
            "Failed to generate budget analysis."
        );
    }
};

export default {
    generateMonthlyInsight,
    generateBudgetAlert,
    generateSavingsTips,
    analyzeTransactionList,
    analyzeBudgetList,
};