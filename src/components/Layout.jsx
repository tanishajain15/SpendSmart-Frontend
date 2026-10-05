import React, {Activity, useEffect, useMemo, useState} from 'react';
import {styles} from '../assets/dummyStyles';
import Navbar from './Navbar';
import  Sidebar  from "./Sidebar";
import { ActivityIcon, ArrowDown, ArrowUp, Car, ChevronDown, ChevronUp, Clock, CreditCard, DollarSign, Gift, Home, Info, PieChart, PiggyBank, RefreshCw, ShoppingCart, TrendingUp, Utensils, Zap } from 'lucide-react';
import axios from 'axios';
import { Outlet } from 'react-router-dom';

import { API_BASE } from "../config";

const CATEGORY_ICONS = {
  Food: <Utensils className="w-4 h-4" />,
  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,
  Utilities: <Zap className="w-4 h-4" />,
  Healthcare: <ActivityIcon className="w-4 h-4" />,
  Salary: <ArrowUp className="w-4 h-4" />,
  Freelance: <CreditCard className="w-4 h-4" />,
  Savings: <PiggyBank className="w-4 h-4" />,
};

//TO FILTER
const filterTransactions = (transactions, frame) => {
  const now = new Date();
  const today = new Date(now).setHours(0, 0, 0, 0);

  switch (frame) {
    case "daily":
      return transactions.filter((t) => new Date(t.date) >= today);
    case "weekly": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return transactions.filter((t) => new Date(t.date) >= startOfWeek);
    }
    case "monthly":
      return transactions.filter(
        (t) => new Date(t.date).getMonth() === now.getMonth()
      );
    default:
      return transactions;
  }
};

const safeArrayFromResponse = (res) => {
  const body = res?.data;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.incomes)) return body.incomes;
  if (Array.isArray(body.expenses)) return body.expenses;
  return [];
};


const Layout = ({ onLogout, user }) => {
    const [transactions, setTransactions] = useState([]);
    const [timeFrame, setTimeFrame] = useState("monthly");
    const [loading, setLoading] = useState(false);  
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    //TO FETCH THE TRANSACTION FROM THE SERVER SIDE 
    const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [incomeRes, expenseRes] = await Promise.all([
        axios.get(`${API_BASE}/income/get`, { headers }),
        axios.get(`${API_BASE}/expense/get`, { headers }),
      ]);

      const incomes = safeArrayFromResponse(incomeRes).map((i) => ({
        ...i,
        type: "income",
      }));
      const expenses = safeArrayFromResponse(expenseRes).map((e) => ({
        ...e,
        type: "expense",
      }));

      const allTransactions = [...incomes, ...expenses]
        .map((t) => ({
          id: t._id || t.id || t.id_str || Math.random().toString(36).slice(2),
          description: t.description || t.title || t.note || "",
          amount: t.amount != null ? Number(t.amount) : Number(t.value) || 0,
          date: t.date || t.createdAt || new Date().toISOString(),
          category: t.category || t.type || "Other",
          type: t.type,
          raw: t,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(allTransactions);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(
        "Failed to fetch transactions",
        err?.response || err.message || err
      );
    } finally {
      setLoading(false);
    }
  };


  //TO ADD TRANSACTION EITHER INCOME OR EXPENSE
  const addTransaction = async (transaction) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint =
        transaction.type === "income" ? "income/add" : "expense/add";
      await axios.post(`${API_BASE}/${endpoint}`, transaction, { headers });
      await fetchTransactions();
      return true;
    } catch (err) {
      console.error(
        "Failed to add transaction",
        err?.response || err.message || err
      );
      throw err;
    }
  };


  //TO UPDATE ANY TRANSACTION
  const editTransaction = async (id, transaction) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint =
        transaction.type === "income" ? "income/update" : "expense/update";
      await axios.put(`${API_BASE}/${endpoint}/${id}`, transaction, {
        headers,
      });
      await fetchTransactions();
      return true;
    } catch (err) {
      console.error(
        "Failed to edit transaction",
        err?.response || err.message || err
      );
      throw err;
    }
  };


  //TO DELETE A TRANSACTION
  const deleteTransaction = async (id, type) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = type === "income" ? "income/delete" : "expense/delete";
      await axios.delete(`${API_BASE}/${endpoint}/${id}`, { headers });
      await fetchTransactions();
      return true;
    } catch (err) {
      console.error(
        "Failed to delete transaction",
        err?.response || err.message || err
      );
      throw err;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, timeFrame),
    [transactions, timeFrame]
  );//FILTER WITH TIMEFRAME


  //GETS STATS DATA ACCORDING TO TIME
  const stats = useMemo(() => {
    const now = new Date();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const thisMonthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfThisMonth && d < startOfNextMonth;
    });

    const lastMonthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfLastMonth && d < startOfThisMonth;
    });

    const thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const thisMonthExpenses = thisMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthIncome = lastMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const allTimeIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const allTimeExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const savingsRate =
      thisMonthIncome > 0
        ? Math.round(((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100)
        : 0;

    const incomeChange =
      lastMonthIncome > 0
        ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100)
        : null;

    const expenseChange =
      lastMonthExpenses > 0
        ? Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
        : null;

    return {
      totalTransactions: transactions.length,
      last30DaysIncome: thisMonthIncome,     // keep the key names so the JSX below doesn't need renaming
      last30DaysExpenses: thisMonthExpenses,
      last30DaysSavings: thisMonthIncome - thisMonthExpenses,
      allTimeIncome,
      allTimeExpenses,
      allTimeSavings: allTimeIncome - allTimeExpenses,
      last30DaysCount: thisMonthTransactions.length,
      savingsRate,
      incomeChange,
      expenseChange,
    };
  }, [transactions]);

  const timeFrameLabel = useMemo(
    () =>
      timeFrame === "daily"
        ? "Today"
        : timeFrame === "weekly"
        ? "This Week"
        : "This Month",
    [timeFrame]
  );

  const outletContext = {
    transactions: filteredTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
    timeFrame,
    setTimeFrame,
    lastUpdated,
  };

  const getSavingsRating = (rate) =>
    rate > 30 ? "Excellent" : rate > 20 ? "Good" : "Needs improvement";


  //FOR FILTER USING CATEGORIES
  const topCategories = useMemo(
    () =>
      Object.entries(
        transactions
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
          }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [transactions]
  );

  const displayedTransactions = showAllTransactions
    ? transactions
    : transactions.slice(0, 4);
    return (
        <div className={styles.layout.root}>
            <Navbar user={user} onLogout={onLogout} />
            <Sidebar user={user} isCollapsed={sidebarCollapsed} 
             setIsCollapsed={setSidebarCollapsed}
            />
            <div className={styles.layout.mainContainer(sidebarCollapsed)}>
                <div className={styles.header.container}>
                    <div>
                        <h1 className={styles.header.title}>Dashboard</h1>
                        <p className={styles.header.subtitle}>Welcome Back</p>
                    </div>
                </div>

                <div className={styles.statCards.grid}>
                    <div className={styles.statCards.card}>
                        <div className={styles.statCards.cardHeader}>
                            <div>
                                <p className={styles.statCards.cardTitle}>Total Balance </p>
                                <p className={styles.statCards.cardValue}>
                                    $
                                    {stats.allTimeSavings.toLocaleString("en-US", {
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div className={styles.statCards.iconContainer("teal")}>
                                <DollarSign className={styles.statCards.icon("teal")} />
                            </div>
                        </div>
                        <p className={styles.statCards.cardFooter}>
                            <span className="text-teal-600 font-medium">
                                +${stats.last30DaysSavings.toLocaleString()}
                            </span>{" "}
                            this month
                        </p>
                    </div>

                    {/* FOR INCOME */}
                    <div className={styles.statCards.card}>
                        <div className={styles.statCards.cardHeader}>
                            <div>
                                <p className={styles.statCards.cardTitle}>Monthly Income</p>
                                <p className={styles.statCards.cardValue}>
                                    $
                                    {stats.last30DaysIncome.toLocaleString("en-US", {
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div className={styles.statCards.iconContainer("green")}>
                                <ArrowUp className={styles.statCards.icon("green")} />
                            </div>
                        </div>
                        <p className={styles.statCards.cardFooter}>
                        {stats.incomeChange === null ? (
                          stats.last30DaysIncome > 0 ? (
                            <span className="text-green-600 font-medium">
                              New income this month
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">
                              No income this month
                            </span>
                          )
                        ) : (
                          <>
                            <span
                              className={`${
                                stats.incomeChange >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              } font-medium`}
                            >
                              {stats.incomeChange > 0 ? "+" : ""}
                              {stats.incomeChange}%
                            </span>{" "}
                            from last month
                          </>
                        )}
                      </p>
                    </div>

                    {/* FOR EXPENSE */}
                    <div className={styles.statCards.card}>
                        <div className={styles.statCards.cardHeader}>
                            <div>
                                <p className={styles.statCards.cardTitle}>Monthly Expense</p>
                                <p className={styles.statCards.cardValue}>
                                    $
                                    {stats.last30DaysExpenses.toLocaleString("en-US", {
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                            <div className={styles.statCards.iconContainer("orange")}>
                                <ArrowDown className={styles.statCards.icon("orange")} />
                            </div>
                        </div>
                        <p className={styles.statCards.cardFooter}>
                          {stats.expenseChange === null ? (
                            stats.last30DaysExpenses > 0 ? (
                              <span className="text-orange-600 font-medium">
                                New expenses this month
                              </span>
                            ) : (
                              <span className="text-gray-500 font-medium">
                                No expenses this month
                              </span>
                            )
                          ) : (
                            <>
                              <span
                                className={`${
                                  stats.expenseChange > 0
                                    ? "text-red-600"
                                    : stats.expenseChange < 0
                                    ? "text-green-600"
                                    : "text-gray-500"
                                } font-medium`}
                              >
                                {stats.expenseChange > 0 ? "+" : ""}
                                {stats.expenseChange}%
                              </span>{" "}
                              from last month
                            </>
                          )}
                        </p>
                    </div>

                    {/*FOR SAVING RATE */}
                    <div className={styles.statCards.card}>
                        <div className={styles.statCards.cardHeader}>
                            <div>
                                <p className={styles.statCards.cardTitle}>Saving Rate</p>
                                <p className={styles.statCards.cardValue}>
                                    {stats.savingsRate}%
                                </p>
                            </div>
                            <div className={styles.statCards.iconContainer("blue")}>
                                <PiggyBank className={styles.statCards.icon("blue")} />
                            </div>
                        </div>
                        <p className={styles.statCards.cardFooter}>
                            {getSavingsRating(stats.savingsRate)}
                        </p>
                    </div>
                </div>

                <div className={styles.grid.main}>
                  <div className={styles.grid.leftColumn}>
                    <div className={styles.cards.base}>
                      <div className={styles.cards.header}>
                        <h3 className={styles.cards.title}>
                          <TrendingUp className=' w-6 h-6 text-teal-500'/>  
                          Financial Overview   
                          <span className=' text-sm text-gray-500 font-normal'>
                            {timeFrameLabel}
                          </span>                     
                        </h3>
                      </div>
                      <Outlet context={outletContext}/>
                    </div>
                  </div>

                  {/* FOR THE RIGHT SIDE COLUMN */}
                  <div className={styles.grid.rightColumn}>
                    <div className={styles.cards.base}>
                      <div className={styles.transactions.cardHeader}>
                        <h3 className={styles.transactions.cardTitle}>
                          <Clock className='w-6 h-6 text-purple-500'/>
                          Recent Transactions
                        </h3>
                        <button onClick={fetchTransactions} disabled={loading}
                        className={styles.transactions.refreshButton}>
                          <RefreshCw className={styles.transactions.refreshIcon(loading)}/>                        
                        </button>
                      </div>

                      <div className={styles.transactions.dataStackingInfo}>
                        <Info className={styles.transactions.dataStackingIcon} />
                        <span>Transactions are stacked by date (newest first)</span>
                      </div>

                      <div className={styles.transactions.listContainer}>
                        {displayedTransactions.map((transactions) => {
                          const {id, type, category, description, date, amount} = transactions;
                          return (
                            <div key={id} className={styles.transactions.transactionItem}>
                              <div className=' flex items-center gap-1 md:gap-4 lg:gap-3'>
                                <div 
                                  className={`p-2 rounded-lg $(styles.colors.transactions.bg(
                                  type
                                  ))`}>
                                    {CATEGORY_ICONS[category] || (
                                      <DollarSign className={styles.transactions.icon} />
                                    )}
                                </div>

                                <div className={styles.transactions.details}>
                                  <p className={styles.transactions.description}>
                                    {description}
                                  </p>

                                  <p className={styles.transactions.meta}>
                                    {new Date(date).toLocaleDateString()}
                                    <span className='ml-2  capitalize'>
                                      {category}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <span className={styles.colors.transaction.text(type)}>
                                { type=== "income" ? "+" : "-"}${Number(amount)}
                              </span>
                            </div>
                          );
                        })}

                        {transactions.length === 0 ? (
                          <div className={styles.transactions.emptyState}>
                            <div className={styles.transactions.emptyIconContainer}>
                              <Clock className={styles.transactions.emptyIcon}/>       
                            </div>
                            <p className={styles.transactions.emptyText}>
                              No recent transactions
                            </p>
                          </div>
                        ): (
                          <div className={styles.transactions.viewAllContainer}>
                            <button onClick={() => setShowAllTransactions(!showAllTransactions)}
                              className={styles.transactions.viewAllButton}
                            >
                              {showAllTransactions ? (
                                <>
                                  <ChevronUp className='w-5  h-5'/>
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className='w-5 h-5'/>
                                  View All Transactions ({transactions.length})                                
                                </>
                                
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                     {/*Spending by card category */}
                     <div className={styles.cards.base}>
                      <h3 className={styles.categories.title}>
                        <PieChart className={styles.categories.titleIcon}/>
                        Spending by Category
                      </h3>

                      <div className={styles.categories.list}>
                        {topCategories.map(([category, amount]) => (
                          <div key={category} className={styles.categories.categoryItem}>
                            <div className=' flex items-center gap-3'>
                              <div className={styles.categories.categoryIconContainer}>
                                {CATEGORY_ICONS[category] || (
                                  <DollarSign
                                    className={styles.categories.categoryIcon}/>
                                )}
                              </div>   
                              <span className={styles.categories.categoryName}>
                                {category}
                              </span>                           
                            </div>
                            <span className={styles.categories.categoryAmount}>
                              ${amount}
                            </span>
                          </div>
                        ))}                 
                      </div>

                      <div className={styles.categories.summaryContainer}>
                        <div className={styles.categories.summaryGrid}>
                          <div className={styles.categories.summaryIncomeCard}>
                            <p className={styles.categories.summaryTitle}>
                              Total Income
                            </p>
                            <p className={styles.categories.summaryValue}>
                              ${stats.allTimeIncome.toLocaleString()}                              
                            </p>
                          </div>
                          <div className={styles.categories.summaryExpenseCard}>
                            <p className={styles.categories.summaryTitle}>
                              Total Expense
                            </p>
                            <p className={styles.categories.summaryValue}>
                              ${stats.allTimeExpenses.toLocaleString()}                              
                            </p>
                          </div>
                        </div>
                      </div>                      
                    </div>
                  </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;