/* ══════════════════════════════════════════════════════════════════
   QAAPF — Quantitative & Analytical Aptitude Proficiency Framework
   
   Grounded in OECD PIAAC Numeracy + PISA Mathematics frameworks.
   Reports 6 proficiency bands (Q1–Q6) mirroring CEFR logic.
   ══════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect } from "react";
import {
  Brain, BarChart2, BookOpen, ChevronDown, ChevronUp,
  FileDown, Layers, Target, TrendingUp, AlertTriangle,
  CheckCircle2, Circle, Award, Users, Clock, Sparkles,
  RefreshCw, Plus, XCircle, GraduationCap,
} from "lucide-react";
import {
  card, cardH, btn, btnP, btnG, inp, num,
  Badge, Empty, Toast, Spinner, Stat, shuffle,
} from "./ui.jsx";
import { downloadCSV } from "../lib/csv.js";
import { insertQuestions, insertQuiz, fetchQuestions } from "../lib/db.js";
import { useAuth } from "../lib/AuthContext.jsx";

/* ── Q-Level definitions ────────────────────────────────────────── */
export const Q_LEVELS = [
  { level:"Q1", label:"Foundation",  color:"bg-rose-500",    light:"bg-rose-50   border-rose-200   text-rose-700",   min:0,  max:24, desc:"Struggles with basic arithmetic and fundamental calculations." },
  { level:"Q2", label:"Elementary",  color:"bg-orange-500",  light:"bg-orange-50 border-orange-200 text-orange-700", min:25, max:44, desc:"Can perform routine calculations; limited to familiar textbook problems." },
  { level:"Q3", label:"Developing",  color:"bg-amber-500",   light:"bg-amber-50  border-amber-200  text-amber-700",  min:45, max:59, desc:"Handles standard aptitude questions; struggles with unfamiliar contexts." },
  { level:"Q4", label:"Proficient",  color:"bg-violet-500",  light:"bg-violet-50 border-violet-200 text-violet-700", min:60, max:74, desc:"Applies mathematics to unfamiliar problems with reasonable accuracy." },
  { level:"Q5", label:"Advanced",    color:"bg-blue-500",    light:"bg-blue-50   border-blue-200   text-blue-700",   min:75, max:89, desc:"Strong quantitative reasoning, data interpretation, and multi-step problems." },
  { level:"Q6", label:"Expert",      color:"bg-emerald-500", light:"bg-emerald-50 border-emerald-200 text-emerald-700", min:90, max:100, desc:"Complex multi-step reasoning, modelling, and evaluation." },
];

export function getQLevel(pct) {
  return Q_LEVELS.find(l => pct >= l.min && pct <= l.max) || Q_LEVELS[0];
}

/* ── Domain weights for profile decomposition ───────────────────── */
export const DOMAINS = [
  { id:"A", name:"Numerical Foundation",         short:"Numbers",   icon:"🔢", units:["Number Sense","Whole Numbers","BODMAS","Fractions","Decimals","Approximation"] },
  { id:"B", name:"Commercial Arithmetic",         short:"Commerce",  icon:"💹", units:["Percentages","Profit & Loss","Discount","Simple Interest","Compound Interest","Ratio & Proportion","Averages"] },
  { id:"C", name:"Quantitative Reasoning",        short:"QR",        icon:"🧮", units:["Number Series","Missing Numbers","Mathematical Patterns","Quantitative Comparisons","Estimation","Multi-step Reasoning"] },
  { id:"D", name:"Algebraic Thinking",            short:"Algebra",   icon:"📐", units:["Basic Algebra","Linear Equations","Simultaneous Equations","Inequalities","Functions"] },
  { id:"E", name:"Data Interpretation",           short:"DI",        icon:"📊", units:["Tables","Bar Charts","Pie Charts","Line Graphs","Percentage Change","Growth Rates","Multi-variable Data"] },
  { id:"F", name:"Logical & Analytical Reasoning",short:"Logic",     icon:"🔍", units:["Logical Sequences","Arrangement","Classification","Conditional Reasoning","Deductive Reasoning","Analytical Puzzles"] },
  { id:"G", name:"Applied Quantitative Reasoning",short:"Applied",   icon:"🌍", units:["Workplace Problems","Financial Literacy","Statistical Interpretation","Decision Making"] },
  { id:"H", name:"Mathematical Problem Solving",  short:"Solving",   icon:"🎯", units:["Complex Multi-step","Modelling","Evaluation","Mathematical Reasoning"] },
];

/* ═══════════════════════════════════════════════════════════════════
   MASTER QUESTION INVENTORY — 480 questions across all 8 domains
   Each question tagged: domain, unit, difficulty (1=easy,2=med,3=hard)
   Options shuffled per attempt in the exam engine.
   ═══════════════════════════════════════════════════════════════════ */
export const QAAPF_QUESTIONS = [
/* ── DOMAIN A: Numerical Foundation ─────────────────────────────── */
// Number Sense
{ d:"A", u:"Number Sense", t:"Number Sense", q:"What is the place value of 7 in 4,72,893?", o:["Thousands","Ten-thousands","Hundreds","Lakhs"], c:0, lv:1 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"Which number is the largest prime below 20?", o:["17","19","13","16"], c:1, lv:1 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"How many factors does 36 have?", o:["6","8","9","7"], c:2, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The LCM of 12, 18 and 24 is:", o:["36","48","72","60"], c:2, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"HCF of 84 and 126 is:", o:["21","42","14","63"], c:1, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"Which of these is divisible by both 4 and 9?", o:["124","108","236","192"], c:1, lv:3 },

// BODMAS
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Solve: 18 ÷ 3 + 4 × 2 − 5", o:["9","11","13","7"], c:1, lv:1 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"What is 5 + 3² × 2 − (4 + 6)?", o:["13","23","7","18"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Evaluate: [4 + (3 × 5) − 12] ÷ 7", o:["1","3","7","2"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Solve: 100 ÷ (5 × 4) + 3² − 8", o:["6","11","5","8"], c:0, lv:3 },

// Fractions & Decimals
{ d:"A", u:"Fractions", t:"Fractions", q:"What is 3/4 + 5/6?", o:["8/10","19/12","13/10","11/12"], c:1, lv:1 },
{ d:"A", u:"Fractions", t:"Fractions", q:"Simplify: 45/75", o:["2/5","3/5","9/15","5/9"], c:1, lv:1 },
{ d:"A", u:"Fractions", t:"Fractions", q:"Which is greater: 7/8 or 5/6?", o:["7/8","5/6","They are equal","Cannot determine"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"0.125 × 0.04 = ?", o:["0.0050","0.005","0.050","0.500"], c:1, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"Round 48.765 to 2 decimal places:", o:["48.76","48.77","48.70","49.00"], c:1, lv:1 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approx value of 399 × 21:", o:["8000","8400","7500","9000"], c:1, lv:2 },

/* ── DOMAIN B: Commercial Arithmetic ────────────────────────────── */
// Percentages
{ d:"B", u:"Percentages", t:"Percentages", q:"What is 15% of 340?", o:["51","56","45","50"], c:0, lv:1 },
{ d:"B", u:"Percentages", t:"Percentages", q:"A score increased from 40 to 50. What is the % increase?", o:["20%","25%","10%","15%"], c:1, lv:1 },
{ d:"B", u:"Percentages", t:"Percentages", q:"If 30% of a number is 90, what is 50% of the number?", o:["150","120","180","200"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"A price of ₹1,200 is reduced by 20% and then by 10%. What is the final price?", o:["₹864","₹840","₹900","₹912"], c:0, lv:3 },
{ d:"B", u:"Percentages", t:"Percentages", q:"Sales rose from ₹2.5 crore to ₹2.95 crore. Approx % increase?", o:["15%","18%","20%","22%"], c:1, lv:2 },

// Profit & Loss
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"CP = ₹400, SP = ₹480. Profit %?", o:["20%","18%","15%","25%"], c:0, lv:1 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A trader sold goods at a 12% loss. SP = ₹880. Find CP.", o:["₹1,000","₹990","₹980","₹1,100"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"By selling an article for ₹680, a man gains 25%. The CP is:", o:["₹544","₹560","₹512","₹600"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A gains 20% after a 20% discount on marked price. CP = ₹1,500. Marked price?", o:["₹2,250","₹2,100","₹2,000","₹1,800"], c:0, lv:3 },

// Discount & Interest
{ d:"B", u:"Discount", t:"Discount", q:"MP = ₹500, discount = 15%. SP = ?", o:["₹425","₹430","₹450","₹420"], c:0, lv:1 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"SI on ₹6,000 at 8% pa for 3 years:", o:["₹1,440","₹1,200","₹1,400","₹1,600"], c:0, lv:1 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"CI on ₹10,000 at 10% pa for 2 years:", o:["₹2,100","₹2,000","₹2,200","₹1,900"], c:0, lv:2 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"₹8,000 at 5% CI (half-yearly) for 1 year. Amount:", o:["₹8,405","₹8,400","₹8,410","₹8,415"], c:0, lv:3 },

// Ratio & Proportion
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"Divide ₹720 in ratio 3:5. Larger share:", o:["₹450","₹270","₹360","₹480"], c:0, lv:1 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"If A:B = 2:3 and B:C = 4:5, then A:C =", o:["8:15","2:5","4:10","6:15"], c:0, lv:2 },
{ d:"B", u:"Averages", t:"Averages", q:"Average of 5 numbers is 14. A 6th number 20 is added. New average:", o:["15","16","14.5","17"], c:0, lv:1 },
{ d:"B", u:"Averages", t:"Averages", q:"The average salary of 8 workers is ₹15,000. If a supervisor earning ₹25,000 joins, the new average is:", o:["₹16,111","₹16,000","₹15,556","₹17,000"], c:0, lv:2 },

/* ── Expansion: Domain A — Numerical Foundation ─────────────────── */
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The sum of the first 20 natural numbers is:", o:["210","200","190","220"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"What is the smallest number that must be added to 4,321 to make it divisible by 9?", o:["5","2","4","7"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"Which of the following is an irrational number?", o:["√2","0.75","22/7","−4"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The square root of 1,764 is:", o:["42","46","38","44"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"If a number is divisible by both 6 and 8, it must be divisible by:", o:["24","48","14","12"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The product of HCF and LCM of two numbers equals:", o:["The product of the numbers","Their sum","Their difference","Their average"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Evaluate: 6 + 2 × (9 − 4) ÷ 5", o:["8","10","4","16"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Simplify: (12 ÷ 4 + 2) × 3 − 2²", o:["11","15","13","9"], c:0, lv:3 },
{ d:"A", u:"Fractions", t:"Fractions", q:"What fraction of an hour is 24 minutes?", o:["2/5","1/3","3/8","1/4"], c:0, lv:1 },
{ d:"A", u:"Fractions", t:"Fractions", q:"Arrange in ascending order: 2/3, 3/5, 5/8", o:["3/5, 5/8, 2/3","2/3, 3/5, 5/8","5/8, 3/5, 2/3","3/5, 2/3, 5/8"], c:0, lv:3 },
{ d:"A", u:"Fractions", t:"Fractions", q:"If 2/5 of a number is 48, the number is:", o:["120","96","110","132"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"Express 0.375 as a fraction in lowest terms:", o:["3/8","5/16","7/20","3/7"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"2.5 ÷ 0.05 = ?", o:["50","5","500","0.5"], c:0, lv:2 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximate: √99 × √26", o:["~50","~45","~55","~60"], c:0, lv:3 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximately what is 19.8% of 2,510?", o:["500","450","550","600"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"How many three-digit numbers are divisible by 7?", o:["128","127","129","126"], c:0, lv:3 },

/* ── Expansion: Domain B — Commercial Arithmetic ────────────────── */
{ d:"B", u:"Percentages", t:"Percentages", q:"If the price of a commodity rises by 25%, by what percent must consumption be reduced to keep expenditure unchanged?", o:["20%","25%","15%","30%"], c:0, lv:3 },
{ d:"B", u:"Percentages", t:"Percentages", q:"A student scored 480 out of 600. The percentage is:", o:["80%","75%","82%","78%"], c:0, lv:1 },
{ d:"B", u:"Percentages", t:"Percentages", q:"45 is what percent of 180?", o:["25%","20%","30%","35%"], c:0, lv:1 },
{ d:"B", u:"Percentages", t:"Percentages", q:"After a 10% increase followed by a 10% decrease, a value of ₹1,000 becomes:", o:["₹990","₹1,000","₹1,010","₹980"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A shopkeeper marks goods 40% above cost and allows a 25% discount. His profit percent is:", o:["5%","10%","15%","12%"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"If CP of 20 articles equals SP of 16 articles, the profit percent is:", o:["25%","20%","30%","16%"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"An item bought for ₹250 is sold for ₹200. The loss percent is:", o:["20%","25%","15%","18%"], c:0, lv:1 },
{ d:"B", u:"Discount", t:"Discount", q:"Successive discounts of 20% and 25% are equivalent to a single discount of:", o:["40%","45%","35%","50%"], c:0, lv:3 },
{ d:"B", u:"Discount", t:"Discount", q:"A ₹2,000 item is offered at ₹1,700. The discount percent is:", o:["15%","17%","12%","20%"], c:0, lv:1 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"In what time will ₹5,000 amount to ₹6,500 at 10% simple interest?", o:["3 years","2 years","4 years","2.5 years"], c:0, lv:2 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"A sum doubles itself in 8 years at simple interest. The rate per annum is:", o:["12.5%","10%","15%","8%"], c:0, lv:3 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"The difference between CI and SI on ₹5,000 at 10% for 2 years is:", o:["₹50","₹100","₹25","₹75"], c:0, lv:3 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"If 3 pens cost ₹45, the cost of 8 pens is:", o:["₹120","₹100","₹135","₹110"], c:0, lv:1 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"Two numbers are in ratio 5:7. If 9 is added to each, the ratio becomes 2:3. The smaller number is:", o:["45","35","40","50"], c:0, lv:3 },
{ d:"B", u:"Averages", t:"Averages", q:"The average of 11 results is 50. The average of the first six is 49 and of the last six is 52. The sixth result is:", o:["56","54","52","58"], c:0, lv:3 },
{ d:"B", u:"Averages", t:"Averages", q:"The mean of 4, 8, 12, 16 and 20 is:", o:["12","10","14","13"], c:0, lv:1 },
{ d:"B", u:"Averages", t:"Averages", q:"A batsman averages 40 in 10 innings. To raise his average to 44, his next score must be:", o:["84","80","88","76"], c:0, lv:3 },

/* ── DOMAIN C: Quantitative Reasoning ───────────────────────────── */
{ d:"C", u:"Number Series", t:"Number Series", q:"2, 5, 10, 17, 26, ?", o:["37","35","36","40"], c:0, lv:1 },
{ d:"C", u:"Number Series", t:"Number Series", q:"3, 6, 12, 24, 48, ?", o:["96","72","84","100"], c:0, lv:1 },
{ d:"C", u:"Number Series", t:"Number Series", q:"1, 4, 9, 16, 25, ?", o:["36","34","30","40"], c:0, lv:1 },
{ d:"C", u:"Number Series", t:"Number Series", q:"5, 11, 23, 47, 95, ?", o:["191","189","193","187"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"2, 3, 5, 8, 13, 21, ?", o:["34","35","32","30"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"144, 121, 100, 81, 64, ?", o:["49","36","56","42"], c:0, lv:2 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"8 × ? = 48 + 24", o:["9","10","8","12"], c:0, lv:1 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"If 4 ∗ 5 = 41 and 3 ∗ 7 = 58, then 6 ∗ 2 = ?", o:["40","38","32","44"], c:0, lv:3 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"If x = 3² + 4 and y = 2³ + 5, which is greater?", o:["x","y","Equal","Cannot determine"], c:0, lv:2 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate: 497 × 203 ÷ 99", o:["~1,000","~2,000","~500","~1,500"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A is twice B. B is 3 more than C. C = 4. What is A?", o:["14","10","12","16"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A train 200m long passes a 400m bridge at 60 km/h. Time taken:", o:["36 sec","30 sec","24 sec","18 sec"], c:0, lv:3 },

/* ── DOMAIN D: Algebraic Thinking ───────────────────────────────── */
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If 3x + 7 = 22, then x = ?", o:["5","4","6","3"], c:0, lv:1 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Simplify: 5(x − 3) + 2x", o:["7x − 15","7x − 3","5x + 2","7x + 15"], c:0, lv:1 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Solve: 2x − 4 = 3x − 9. Then x = ?", o:["5","4","−5","3"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"x + y = 10 and x − y = 4. Find x.", o:["7","6","8","5"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"2x + 3y = 12 and x − y = 1. Find y.", o:["2","3","4","1"], c:0, lv:3 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"If 2x + 3 > 11, which is NOT a possible value of x?", o:["5","6","4","7"], c:2, lv:2 },
{ d:"D", u:"Functions", t:"Algebra", q:"f(x) = 2x² − x + 3. f(2) = ?", o:["9","11","13","7"], c:0, lv:3 },

/* ── Expansion: Domain C — Quantitative Reasoning ───────────────── */
{ d:"C", u:"Number Series", t:"Number Series", q:"7, 14, 28, 56, ?", o:["112","98","84","120"], c:0, lv:1 },
{ d:"C", u:"Number Series", t:"Number Series", q:"1, 8, 27, 64, ?", o:["125","100","81","144"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"2, 6, 12, 20, 30, ?", o:["42","40","36","44"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"120, 60, 30, 15, ?", o:["7.5","10","5","12"], c:0, lv:1 },
{ d:"C", u:"Number Series", t:"Number Series", q:"3, 7, 16, 35, 74, ?", o:["153","148","155","160"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"1, 2, 6, 24, 120, ?", o:["720","600","640","840"], c:0, lv:2 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"If 5 # 3 = 34 and 7 # 2 = 53, then 4 # 6 = ?", o:["52","48","50","56"], c:0, lv:3 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"36 ÷ ? + 5 = 14", o:["4","6","3","9"], c:0, lv:1 },
{ d:"C", u:"Mathematical Patterns", t:"Patterns", q:"In the sequence 2, 4, 8, 16 the ratio between consecutive terms is:", o:["Constant at 2","Increasing","Decreasing","Random"], c:0, lv:1 },
{ d:"C", u:"Mathematical Patterns", t:"Patterns", q:"Which number does not belong: 4, 9, 16, 24, 36?", o:["24","16","9","36"], c:0, lv:2 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Compare: A = 20% of 150, B = 15% of 200", o:["A = B","A > B","B > A","Cannot determine"], c:0, lv:2 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Which is largest: 3/7, 0.45, 43%?", o:["0.45","3/7","43%","All equal"], c:0, lv:3 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate 4,987 ÷ 49:", o:["~100","~120","~80","~150"], c:0, lv:1 },
{ d:"C", u:"Estimation", t:"Estimation", q:"A shop sells 87 units daily at ₹412 each. Approximate monthly revenue (30 days):", o:["₹10.7 lakh","₹8 lakh","₹12 lakh","₹9 lakh"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A father is 3 times his son's age. In 12 years he will be twice. Son's present age:", o:["12","10","14","16"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A man walks 3 km north, then 4 km east. His distance from start:", o:["5 km","7 km","6 km","4 km"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"12 workers build a wall in 10 days. How long for 15 workers?", o:["8 days","9 days","7 days","12 days"], c:0, lv:2 },

/* ── Expansion: Domain D — Algebraic Thinking ───────────────────── */
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Expand: (x + 3)(x − 2)", o:["x² + x − 6","x² − x − 6","x² + 5x − 6","x² − 6"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If a = 4 and b = −2, evaluate 3a² − 2b:", o:["52","44","48","40"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Factorise: x² − 9", o:["(x−3)(x+3)","(x−9)(x+1)","(x−3)²","(x+9)(x−1)"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Simplify: 4x + 3y − 2x + 5y", o:["2x + 8y","6x + 8y","2x + 2y","6x + 2y"], c:0, lv:1 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Solve: (x/3) + 4 = 10", o:["18","12","21","15"], c:0, lv:1 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Solve: 5(2x − 3) = 3(x + 4)", o:["27/7","3","4","21/7"], c:0, lv:3 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"The sum of three consecutive integers is 72. The largest is:", o:["25","24","23","26"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"3x + 2y = 16 and x + y = 6. Find x.", o:["4","3","5","2"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"The cost of 2 pens and 3 books is ₹340; 3 pens and 2 books cost ₹310. Cost of one book:", o:["₹100","₹80","₹90","₹110"], c:0, lv:3 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"Solve: 3x − 5 ≤ 10", o:["x ≤ 5","x ≥ 5","x < 5","x > 5"], c:0, lv:2 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"If −2 < x < 5 and x is an integer, how many values can x take?", o:["6","7","5","8"], c:0, lv:3 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = 3x − 4, find f(5):", o:["11","15","19","7"], c:0, lv:1 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = x² and g(x) = x + 2, then f(g(1)) = ?", o:["9","3","6","4"], c:0, lv:3 },
{ d:"D", u:"Functions", t:"Algebra", q:"A linear function passes through (0, 3) and (2, 7). Its slope is:", o:["2","3","4","1.5"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If x + 1/x = 5, then x² + 1/x² equals:", o:["23","25","21","27"], c:0, lv:3 },

/* ── DOMAIN E: Data Interpretation ──────────────────────────────── */
{ d:"E", u:"Tables", t:"Tables", q:"A table shows sales: Mon=120, Tue=95, Wed=140, Thu=110, Fri=135. Average daily sales:", o:["120","110","115","125"], c:0, lv:1 },
{ d:"E", u:"Tables", t:"Tables", q:"In the same table, which day had below-average sales?", o:["Tuesday and Thursday","Monday only","Wednesday only","Friday only"], c:0, lv:2 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"A bar chart shows exports: 2020=₹400cr, 2021=₹500cr, 2022=₹600cr. % increase 2020→2022:", o:["50%","25%","60%","40%"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"A pie chart shows 30% transport costs from a total budget of ₹5 lakhs. Transport budget:", o:["₹1.5 lakh","₹1.0 lakh","₹2.0 lakh","₹1.8 lakh"], c:0, lv:1 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"If sales = 40%, admin = 20%, HR = 15%, R&D = 25% of ₹8 cr, R&D budget:", o:["₹2 cr","₹1.5 cr","₹3.2 cr","₹2.5 cr"], c:0, lv:2 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"Revenue: Q1=₹120cr, Q2=₹96cr. % decline:", o:["20%","25%","16%","30%"], c:0, lv:2 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Population grew from 5 lakh to 6.05 lakh in 2 years. Annual growth rate (approx):", o:["10%","5%","8%","12%"], c:1, lv:3 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Sales A=200,B=150,C=250,D=300 and costs are 60% of sales for each. Company with highest profit:", o:["D","C","A","B"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"A line graph shows temperature rising steadily from 25°C in January to 40°C in May. Average rise per month:", o:["3°C","3.75°C","5°C","2.5°C"], c:1, lv:2 },

/* ── DOMAIN F: Logical & Analytical Reasoning ───────────────────── */
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"B, E, H, K, ?", o:["N","M","O","P"], c:0, lv:1 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"AZ, BY, CX, DW, ?", o:["EV","EU","FV","EW"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"5 students sit in a row. A is 2nd from left, B is 4th. How many are between them?", o:["1","2","3","0"], c:0, lv:1 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"Among 6 friends P,Q,R,S,T,U ranked 1–6, P is higher than Q. Q is directly above R. R is 4th. Q's rank:", o:["3","2","5","1"], c:0, lv:2 },
{ d:"F", u:"Classification", t:"Classification", q:"Which is the odd one out: 81, 64, 48, 36, 25?", o:["48","36","64","81"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"All A are B. Some B are C. Therefore:", o:["Some A may be C","All A are C","No A is C","All C are A"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"If no poet is rich, and Ram is a poet, then:", o:["Ram is not rich","Ram may be rich","Ram is wealthy","Cannot conclude"], c:0, lv:2 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"All mangoes are fruits. Some fruits are sweet. Therefore:", o:["Some mangoes may be sweet","All mangoes are sweet","No mango is sweet","All fruits are mango"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"3 boxes contain only apples, only oranges, or both. All labels are wrong. The 'Both' box has one apple. The other boxes contain:", o:["Apples=oranges, Oranges=both","Apples=both, Oranges=apples","Cannot determine","Both are apples"], c:1, lv:3 },

/* ── Expansion: Domain E — Data Interpretation ──────────────────── */
{ d:"E", u:"Tables", t:"Tables", q:"Quarterly profit (₹cr): Q1=12, Q2=18, Q3=15, Q4=21. Total annual profit:", o:["₹66 cr","₹60 cr","₹70 cr","₹64 cr"], c:0, lv:1 },
{ d:"E", u:"Tables", t:"Tables", q:"Using the same data, which quarter contributed closest to 25% of annual profit?", o:["Q3","Q1","Q2","Q4"], c:0, lv:3 },
{ d:"E", u:"Tables", t:"Tables", q:"Enrolment: MBA=180, BBA=240, BCom=300. MBA students as a percentage of the total:", o:["25%","30%","20%","24%"], c:0, lv:2 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"A bar chart shows monthly output: Jan=40, Feb=55, Mar=35, Apr=70. The range is:", o:["35","30","70","45"], c:0, lv:1 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Using the same output data, the percentage rise from March to April is:", o:["100%","50%","75%","35%"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"In a pie chart, a sector representing 25% corresponds to a central angle of:", o:["90°","75°","120°","60°"], c:0, lv:1 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"A sector has a central angle of 54°. The percentage it represents is:", o:["15%","18%","12%","20%"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"Sales fell steadily from 500 units in Week 1 to 300 units in Week 5. Average weekly decline:", o:["50 units","40 units","60 units","45 units"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"A line graph is flat across three consecutive periods. This indicates:", o:["No change in the measured value","Steady growth","Steady decline","Missing data"], c:0, lv:1 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"Costs rose from ₹80 lakh to ₹92 lakh. The percentage increase is:", o:["15%","12%","18%","20%"], c:0, lv:2 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"A value falls 20% then rises 20%. Compared with the original it is:", o:["4% lower","Unchanged","4% higher","2% lower"], c:0, lv:3 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Revenue doubled over 4 years. The approximate compound annual growth rate is:", o:["19%","25%","15%","12%"], c:0, lv:3 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Users grew 10% annually from 20,000. After 2 years the count is:", o:["24,200","24,000","22,000","26,000"], c:0, lv:2 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Four outlets report revenue 500/600/450/700 and costs 300/420/270/560. Which has the highest margin percentage?", o:["Outlet 3","Outlet 1","Outlet 2","Outlet 4"], c:0, lv:3 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Department budgets: A=₹4L, B=₹6L, C=₹10L. B's share of the total is:", o:["30%","25%","35%","20%"], c:0, lv:2 },

/* ── Expansion: Domain F — Logical & Analytical Reasoning ───────── */
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"A, C, F, J, ?", o:["O","M","N","P"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"Z, X, V, T, ?", o:["R","S","Q","U"], c:0, lv:1 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"AB, DE, GH, JK, ?", o:["MN","LM","NO","KL"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"In a row of 25 students, Ravi is 11th from the left. His position from the right is:", o:["15th","14th","16th","13th"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"Five books are stacked. A is above B, C is below B, D is at the top. A's position from the top is:", o:["2nd","1st","3rd","4th"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"P, Q, R, S sit around a circular table. P faces R and Q is to P's immediate left. Who is to P's right?", o:["S","Q","R","Cannot determine"], c:0, lv:3 },
{ d:"F", u:"Classification", t:"Classification", q:"Find the odd one out: Triangle, Square, Circle, Rectangle", o:["Circle","Triangle","Square","Rectangle"], c:0, lv:1 },
{ d:"F", u:"Classification", t:"Classification", q:"Find the odd one out: 2, 3, 5, 7, 9, 11", o:["9","5","7","11"], c:0, lv:1 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"If it rains, the match is cancelled. The match was not cancelled. Therefore:", o:["It did not rain","It rained","The match was postponed","Cannot conclude"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"Only graduates can apply. Meena applied successfully. Therefore:", o:["Meena is a graduate","Meena may not be a graduate","Meena is employed","Cannot conclude"], c:0, lv:2 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"Some managers are engineers. All engineers are graduates. Which follows?", o:["Some managers are graduates","All managers are graduates","No manager is a graduate","All graduates are managers"], c:0, lv:3 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"No student failed. Rahul is a student. Therefore Rahul:", o:["Passed","Failed","May have failed","Did not appear"], c:0, lv:1 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"Four friends have different incomes. A earns more than B, C earns less than B, D earns more than A. Who earns least?", o:["C","B","A","D"], c:0, lv:2 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"A clock shows 3:15. The angle between the hands is:", o:["7.5°","0°","15°","30°"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"If today is Wednesday, what day will it be after 100 days?", o:["Friday","Thursday","Saturday","Sunday"], c:0, lv:3 },

/* ── DOMAIN G: Applied Quantitative Reasoning ───────────────────── */
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A manager earns ₹45,000/month. She gets 12% annual bonus. Her bonus amount:", o:["₹64,800","₹54,000","₹5,400","₹6,480"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A team of 4 completes a project in 12 days. How many days for 6 team members (same rate)?", o:["8","6","9","10"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A loan of ₹50,000 at 12% pa SI for 2 years. Total repayment:", o:["₹62,000","₹56,000","₹60,000","₹64,000"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"If a product's GST is 18% on a base price of ₹2,500, the consumer pays:", o:["₹2,950","₹3,000","₹2,900","₹2,800"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Test scores: 45,60,55,70,65,80,50. The median score:", o:["60","65","55","62"], c:1, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Mode of: 3,5,5,7,3,5,9,3,5,7 is:", o:["5","3","7","3 and 5"], c:0, lv:1 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Investment A gives 8% in 3 years. Investment B gives 7.5% compounded annually. For ₹10,000, which gives more return?", o:["B","A","Equal","Cannot determine"], c:0, lv:3 },

/* ── DOMAIN H: Mathematical Problem Solving ─────────────────────── */
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A cistern is filled by pipe A in 6 hrs and B in 9 hrs. Pipe C empties it in 12 hrs. All three open together: time to fill?", o:["36/5 hrs","4 hrs","5 hrs","6 hrs"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A train running at 72 km/h crosses a pole in 8 seconds. Length of train:", o:["160 m","180 m","200 m","140 m"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Two trains 150m and 200m long run in opposite directions at 60 and 90 km/h. Time to cross:", o:["10 sec","8 sec","12 sec","7 sec"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"A shop's monthly revenue R = 200q − 0.5q², where q = units sold. Revenue when q=100:", o:["₹15,000","₹20,000","₹18,000","₹25,000"], c:0, lv:3 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A student got 75% in 4 subjects. To achieve 80% overall in 5 subjects, marks needed in the 5th (out of 100):", o:["100","95","90","85"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"The product of two consecutive even numbers is 288. The larger number:", o:["18","16","20","14"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"Three numbers are in ratio 2:3:4. Their LCM is 48. The largest number:", o:["16","8","12","24"], c:0, lv:3 },
/* ── Expansion: Domain G — Applied Quantitative Reasoning ───────── */
{ d:"G", u:"Workplace Problems", t:"Applied", q:"An employee works 8 hours daily for 22 days at ₹250 per hour. Monthly earnings:", o:["₹44,000","₹40,000","₹48,000","₹42,000"], c:0, lv:1 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A machine produces 240 units in 6 hours. At the same rate, units in a 9-hour shift:", o:["360","320","400","300"], c:0, lv:1 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A project needs 600 person-hours. With 5 people working 8 hours daily, days required:", o:["15","12","18","20"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"Attrition reduced headcount from 250 to 215 in a year. The attrition rate is:", o:["14%","12%","16%","10%"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A salary of ₹60,000 has 12% deducted for provident fund. Take-home pay:", o:["₹52,800","₹54,000","₹50,400","₹53,200"], c:0, lv:1 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"An EMI of ₹15,000 runs for 24 months on a ₹3,00,000 loan. Total interest paid:", o:["₹60,000","₹45,000","₹50,000","₹72,000"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"Inflation is 6% annually. An item costing ₹1,000 today will cost approximately how much in 2 years?", o:["₹1,124","₹1,120","₹1,060","₹1,200"], c:0, lv:3 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A mutual fund returns 12% while inflation is 7%. The real return is approximately:", o:["5%","12%","19%","7%"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"The mean of 5, 10, 15, 20, 25 is:", o:["15","16","14","17"], c:0, lv:1 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"A dataset has mean 50 and median 35. The distribution is most likely:", o:["Right-skewed","Left-skewed","Symmetric","Uniform"], c:0, lv:3 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Range of the data 12, 45, 23, 67, 34 is:", o:["55","67","45","43"], c:0, lv:1 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"If every value in a dataset increases by 10, the standard deviation:", o:["Stays the same","Increases by 10","Doubles","Decreases"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Supplier A charges ₹50/unit with ₹2,000 fixed cost; B charges ₹60/unit with no fixed cost. At what volume is A cheaper?", o:["Above 200 units","Above 100 units","Above 300 units","Always"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"A product sells at ₹500 with variable cost ₹300 and fixed costs ₹40,000. Break-even quantity:", o:["200 units","150 units","250 units","180 units"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Plan A: ₹300/month flat. Plan B: ₹100 + ₹2 per unit. At 150 units, which is cheaper?", o:["Plan A","Plan B","Equal","Cannot determine"], c:0, lv:2 },

/* ── Expansion: Domain H — Mathematical Problem Solving ─────────── */
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A boat travels 30 km downstream in 2 hours and returns in 3 hours. Speed of the stream:", o:["2.5 km/h","5 km/h","3 km/h","1.5 km/h"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Pipe A fills a tank in 20 minutes, pipe B in 30 minutes. Together they take:", o:["12 minutes","15 minutes","10 minutes","25 minutes"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A mixture of 40 litres has milk and water in ratio 3:1. Water to be added to make the ratio 3:2:", o:["10 litres","5 litres","15 litres","8 litres"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A car covers 120 km at 60 km/h and returns at 40 km/h. Average speed for the whole journey:", o:["48 km/h","50 km/h","45 km/h","52 km/h"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Cost C = 5,000 + 25q. The cost of producing 400 units is:", o:["₹15,000","₹12,000","₹10,000","₹18,000"], c:0, lv:1 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Profit P = 80q − 0.4q² − 1,000. Profit at q = 50:", o:["₹2,000","₹1,800","₹2,200","₹1,500"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"A population model N = 1,000 × 1.05ᵗ describes:", o:["5% growth per period","5 added per period","5% decline","Constant population"], c:0, lv:2 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A calculation gives an average class age of 250 years. The most reasonable conclusion is:", o:["There is an error in the calculation","The class is very old","The data is correct","Ages were underreported"], c:0, lv:1 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A survey of 20 people is used to claim a national trend. The main weakness is:", o:["Sample size is too small","The questions were unclear","The maths is wrong","Nothing is wrong"], c:0, lv:2 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"Ice cream sales and drowning deaths both rise in summer. Concluding one causes the other confuses:", o:["Correlation with causation","Mean with median","Ratio with proportion","Sample with population"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"The sum of two numbers is 25 and their difference is 7. The larger number is:", o:["16","18","15","17"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"If the perimeter of a square equals the perimeter of a rectangle 8 cm × 4 cm, the side of the square is:", o:["6 cm","5 cm","7 cm","8 cm"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"A number increased by 20% gives 96. The original number is:", o:["80","76","85","72"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"The area of a circle doubles. Its radius increases by a factor of:", o:["√2","2","4","1.5"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Three taps fill a tank in 10, 15 and 30 minutes respectively. Opened together, time to fill:", o:["5 minutes","6 minutes","4 minutes","8 minutes"], c:0, lv:3 },

];

/* ── Difficulty label helper ─────────────────────────────────────── */
const diffLabel = v => v===1?"Easy":v===2?"Medium":"Hard";
const diffTone  = v => v===1?"emerald":v===2?"amber":"rose";

/* ══════════════════════════════════════════════════════════════════
   STUDENT APTITUDE PROFILE — computed from attempt items
   ══════════════════════════════════════════════════════════════════ */
/* Difficulty weights. A flat percentage cannot separate a student who
   cleared twenty easy items from one who cleared ten hard ones, and the
   whole point of the bands is to locate where competence stops. Harder
   items therefore carry more weight in both the numerator and the
   denominator, so the score reads as "proportion of difficulty mastered"
   rather than "proportion of questions answered". */
const LEVEL_WEIGHT = { 1: 1, 2: 1.6, 3: 2.4 };

/* A domain judged on two questions is noise. Below this many items the
   score is reported but flagged as provisional rather than presented as
   a proficiency finding. */
export const RELIABLE_MIN = 6;

/* Resolve any question — built-in or teacher-authored — to a domain.
   Built-in items are matched on their exact text, which survives the
   round trip through the database. Teacher questions are matched on
   unit or topic against the domain vocabulary. */
function buildDomainIndex(allQuestions) {
  const byText = new Map();   // normalised question text -> { domain, level }
  const byId   = new Map();   // database id              -> { domain, level }

  const norm = t => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");

  for (const bq of QAAPF_QUESTIONS) {
    byText.set(norm(bq.q), { domain: bq.d, level: bq.lv });
  }

  for (const q of (allQuestions || [])) {
    const hit = byText.get(norm(q.question));
    if (hit) { byId.set(q.id, hit); continue; }

    // Teacher-authored: match unit or topic against domain vocabulary.
    const u = norm(q.unit), t = norm(q.topic);
    const dom = DOMAINS.find(d => d.units.some(x => {
      const n = norm(x);
      return n === u || n === t || u.includes(n) || n.includes(u);
    }));
    if (!dom) continue;
    const lvl = q.difficulty === "hard" ? 3 : q.difficulty === "easy" ? 1 : 2;
    byId.set(q.id, { domain: dom.id, level: lvl });
  }

  return { byId, byText, norm };
}

export function computeQAAPFProfile(attempts, allQuestions) {
  const { byId, byText, norm } = buildDomainIndex(allQuestions);

  const domainScore = {};
  for (const d of DOMAINS) {
    domainScore[d.id] = { wCorrect: 0, wTotal: 0, correct: 0, seen: 0, byLevel: { 1: { c: 0, n: 0 }, 2: { c: 0, n: 0 }, 3: { c: 0, n: 0 } } };
  }

  /* Walk every answered item exactly once. Keying the accumulation off
     the item itself — rather than iterating the bank and looking items
     up — is what stops a question being counted twice when it appears
     in both the built-in set and the teacher's bank. */
  for (const att of attempts || []) {
    for (const it of (att.items || [])) {
      const meta = byId.get(it.qid) || byText.get(norm(it.question));
      if (!meta) continue;                       // outside the framework
      const bucket = domainScore[meta.domain];
      if (!bucket) continue;
      const w  = LEVEL_WEIGHT[meta.level] || 1;
      const ok = it.chosen === it.correct;
      bucket.seen++; bucket.wTotal += w;
      if (ok) { bucket.correct++; bucket.wCorrect += w; }
      const lv = bucket.byLevel[meta.level];
      if (lv) { lv.n++; if (ok) lv.c++; }
    }
  }

  const domainProfiles = DOMAINS.map(dom => {
    const b = domainScore[dom.id];
    const pct = b.wTotal ? Math.round((b.wCorrect / b.wTotal) * 100) : null;
    return {
      ...dom,
      correct: b.correct,
      total:   b.seen,
      pct,
      level:    pct !== null ? getQLevel(pct) : null,
      reliable: b.seen >= RELIABLE_MIN,
      byLevel:  b.byLevel,
      /* Where competence stops: the hardest tier the student still
         clears at 60% or better. This is the diagnostic claim the
         bands are meant to support. */
      ceiling: [3, 2, 1].find(l => b.byLevel[l].n >= 2 && b.byLevel[l].c / b.byLevel[l].n >= 0.6) || null,
    };
  });

  const wCorrect = Object.values(domainScore).reduce((s, v) => s + v.wCorrect, 0);
  const wTotal   = Object.values(domainScore).reduce((s, v) => s + v.wTotal, 0);
  const seen     = Object.values(domainScore).reduce((s, v) => s + v.seen, 0);
  const correct  = Object.values(domainScore).reduce((s, v) => s + v.correct, 0);

  const overallPct   = wTotal ? Math.round((wCorrect / wTotal) * 100) : null;
  const overallLevel = overallPct !== null ? getQLevel(overallPct) : null;

  const assessed  = domainProfiles.filter(d => d.pct !== null);
  const strengths = assessed.filter(d => d.pct >= 70).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const gaps      = assessed.filter(d => d.pct <  60).sort((a, b) => a.pct - b.pct).slice(0, 3);

  return {
    domainProfiles, overallPct, overallLevel, strengths, gaps,
    totalSeen: seen, totalCorrect: correct,
    coverage: assessed.length,                 // domains with any evidence
    reliable: seen >= RELIABLE_MIN * 2,
  };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN QAAPF PANEL (faculty view)
   ══════════════════════════════════════════════════════════════════ */
export default function QAAPFPanel({ attempts, classrooms, questions, quizzes, setQuizzes, setQuestions }) {
  const [tab, setTab] = useState("baseline");
  const [toast, setToast] = useState(null);
  const toast2 = (m, t="emerald") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  const TABS = [
    ["baseline",  "Baseline test"],
    ["dashboard", "Results"],
    ["cohort",    "Heatmap"],
    ["bank",      "Question bank"],
    ["levels",    "Framework"],
  ];

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.m} tone={toast.t} onDismiss={()=>setToast(null)}/>}

      {/* Header */}
      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2"><Brain size={20}/> QAAPF</h2>
              <p className="mt-0.5 text-sm text-violet-200">Quantitative &amp; Analytical Aptitude Proficiency Framework</p>
              <p className="mt-1 text-[11px] text-violet-300">Grounded in OECD PIAAC Numeracy · 8 domains · 6 proficiency bands · {QAAPF_QUESTIONS.length} questions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TABS.map(([t, label]) => (
                <button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${tab===t?"bg-white text-violet-700":"bg-white/10 text-white hover:bg-white/20"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tab==="baseline"  && <BaselineGenerator questions={questions} setQuestions={setQuestions} quizzes={quizzes} setQuizzes={setQuizzes} classrooms={classrooms} attempts={attempts} onDone={toast2} goResults={()=>setTab("dashboard")}/>}
      {tab==="dashboard" && <Dashboard attempts={attempts} questions={questions} quizzes={quizzes} classrooms={classrooms}/>}
      {tab==="levels"    && <LevelsGuide/>}
      {tab==="bank"      && <QuestionInventory questions={questions} setQuestions={setQuestions} toast2={toast2}/>}
      {tab==="cohort"    && <CohortHeatmap attempts={attempts} questions={questions}/>}
    </div>
  );
}

/* ── Baseline test generator ───────────────────────────────────────
   The purpose of QAAPF is diagnosis, and there was no way to actually
   run a diagnostic. This builds a balanced test that touches all 8
   domains across the difficulty range, imports any missing questions,
   creates the quiz, and hands back a shareable link — the whole
   workflow a teacher needs to establish a cohort baseline in one place. */
function BaselineGenerator({ questions, setQuestions, quizzes, setQuizzes, classrooms, attempts, onDone, goResults }) {
  const { user, profile } = useAuth();
  const rooms = useMemo(() => (classrooms || []).filter(c => !c.is_archived), [classrooms]);

  const [classroomId, setClassroomId] = useState(rooms[0]?.id || "");
  const [perDomain, setPerDomain]     = useState(5);       // questions per domain
  const [minutes, setMinutes]         = useState(60);
  const [mix, setMix]                 = useState("balanced");  // balanced | ramp
  const [busy, setBusy]               = useState(false);
  const [created, setCreated]         = useState(null);    // { quiz, link }
  const [copied, setCopied]           = useState(false);

  const totalQ = perDomain * DOMAINS.length;

  // How many built-in questions exist per domain, to cap the request.
  const availByDomain = useMemo(() => {
    const m = {};
    for (const d of DOMAINS) m[d.id] = QAAPF_QUESTIONS.filter(q => q.d === d.id).length;
    return m;
  }, []);
  const minAvail = Math.min(...DOMAINS.map(d => availByDomain[d.id]));

  /* Pick a difficulty-balanced sample from a domain. "balanced" spreads
     easy/medium/hard evenly; "ramp" front-loads easier items so a weak
     cohort isn't demoralised in the first minutes — either way every
     domain is represented, which is what makes the result a profile
     rather than a single number. */
  const pickForDomain = (domId, n) => {
    const pool = QAAPF_QUESTIONS.filter(q => q.d === domId);
    const byLv = { 1: shuffle(pool.filter(q=>q.lv===1)), 2: shuffle(pool.filter(q=>q.lv===2)), 3: shuffle(pool.filter(q=>q.lv===3)) };
    const order = mix === "ramp" ? [1,1,2,2,3] : [1,2,3,2,1];
    const out = [];
    let i = 0;
    while (out.length < n && (byLv[1].length || byLv[2].length || byLv[3].length)) {
      const lv = order[i % order.length]; i++;
      if (byLv[lv].length) out.push(byLv[lv].pop());
      else if (byLv[2].length) out.push(byLv[2].pop());
      else if (byLv[1].length) out.push(byLv[1].pop());
      else if (byLv[3].length) out.push(byLv[3].pop());
    }
    return out;
  };

  const generate = async () => {
    if (!classroomId && rooms.length) { onDone("Pick a classroom first.", "amber"); return; }
    setBusy(true);
    try {
      // 1. Assemble the blueprint across all domains.
      const blueprint = DOMAINS.flatMap(d => pickForDomain(d.id, perDomain));

      // 2. Ensure each blueprint question exists in the bank; import missing.
      const norm = t => String(t||"").trim().toLowerCase().replace(/\s+/g," ");
      const bankByText = new Map(questions.map(q => [norm(q.question), q]));
      const missing = blueprint.filter(b => !bankByText.has(norm(b.q)));
      let liveBank = questions;
      if (missing.length) {
        const rows = missing.map(q => ({
          subject: "Aptitude", unit: q.u, topic: q.t, question: q.q,
          options: q.o, correct: q.c,
          difficulty: q.lv===1?"easy":q.lv===2?"medium":"hard", points: 1,
        }));
        const inserted = await insertQuestions(rows);
        liveBank = [...questions, ...inserted];
        setQuestions(liveBank);
        for (const q of inserted) bankByText.set(norm(q.question), q);
      }

      // 3. Resolve the blueprint to real question ids, preserving order.
      const ids = blueprint.map(b => bankByText.get(norm(b.q))?.id).filter(Boolean);
      const units = Array.from(new Set(blueprint.map(b => b.u)));

      // 4. Create the quiz. Closed answer key so students can't harvest it.
      const room = rooms.find(r => r.id === classroomId);
      const quiz = await insertQuiz({
        title: `Aptitude Baseline${room ? " — " + room.name : ""}`,
        subject: "Aptitude",
        week: 1,
        units,
        question_ids: ids,
        draw_count: ids.length,
        duration_sec: Number(minutes) * 60,
        max_attempts: 1,
        classroom_id: classroomId || null,
        is_open: true,
        show_answers_policy: "after_close",
        created_by: user.id,
      });
      setQuizzes(prev => [...prev, quiz]);

      const link = `${window.location.origin}?quiz=${quiz.id}`;
      setCreated({ quiz, link });
      onDone(`Baseline created — ${ids.length} questions across ${DOMAINS.length} domains.`);
    } catch (e) {
      onDone(e.message || "Could not create the baseline test.", "rose");
    }
    setBusy(false);
  };

  const copyLink = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.link); setCopied(true); setTimeout(()=>setCopied(false), 2500); } catch {}
  };

  /* How many students already have a baseline result, so the teacher
     knows whether to run it or go straight to the profile. */
  const baselineQuizIds = new Set(quizzes.filter(q => (q.subject||"").toLowerCase()==="aptitude").map(q=>q.id));
  const baselineTakers = new Set(attempts.filter(a => baselineQuizIds.has(a.quiz_id)).map(a=>a.user_id)).size;

  if (created) {
    return (
      <div className={`${card} p-6 space-y-5`}>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={22}/></div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Baseline test is live</h3>
            <p className="text-xs text-slate-500">"{created.quiz.title}" · {created.quiz.question_ids.length} questions · {Math.round(created.quiz.duration_sec/60)} min · one attempt</p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="mb-1 text-xs font-semibold text-violet-700">Share this link with students</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-600">{created.link}</code>
            <button onClick={copyLink} className={btnP}>{copied ? <><CheckCircle2 size={14}/> Copied</> : "Copy link"}</button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-violet-600">
            Students open the link, fill their profile once, and sit the test. Results build the aptitude profile automatically — no marking needed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={goResults} className={btnG}><BarChart2 size={14}/> View results dashboard</button>
          <button onClick={()=>setCreated(null)} className={btnG}><RefreshCw size={14}/> Create another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600"><Target size={20}/></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Generate a diagnostic baseline test</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Builds one balanced test spanning all 8 domains and the full difficulty range, so each student's result is a profile — strong in Commerce, weak in Algebra — not a single score. Missing questions are added to your bank automatically.
            </p>
          </div>
        </div>

        {baselineTakers > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 size={14}/> {baselineTakers} student{baselineTakers===1?" has":"s have"} already completed a baseline. See the Results tab for their profiles.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Classroom</label>
            <select className={inp} value={classroomId} onChange={e=>setClassroomId(e.target.value)}>
              {rooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.section?` · ${c.section}`:""}{c.year?` (${c.year})`:""}</option>)}
              {!rooms.length && <option value="">— create a classroom first —</option>}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Time limit (minutes)</label>
            <input type="number" min={10} max={180} className={`${inp} ${num}`} value={minutes} onChange={e=>setMinutes(Math.max(10, Number(e.target.value)||10))}/>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Questions per domain</label>
            <select className={inp} value={perDomain} onChange={e=>setPerDomain(Number(e.target.value))}>
              {[3,4,5,6,8].filter(n => n <= minAvail).map(n => <option key={n} value={n}>{n} per domain · {n*8} total</option>)}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">More per domain = a more reliable profile but a longer test.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty order</label>
            <select className={inp} value={mix} onChange={e=>setMix(e.target.value)}>
              <option value="balanced">Balanced — even spread throughout</option>
              <option value="ramp">Gentle ramp — easier questions first</option>
            </select>
          </div>
        </div>

        {/* Blueprint preview */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">This test will cover</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {DOMAINS.map(d => (
              <div key={d.id} className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[11px] text-slate-600 border border-slate-100">
                <span>{d.icon}</span><span className="truncate">{d.short}</span>
                <span className={`${num} ml-auto text-slate-400`}>{Math.min(perDomain, availByDomain[d.id])}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">{totalQ} questions · {minutes} min · one attempt · answers hidden until close</p>
          <button className={btnP} disabled={busy || (!classroomId && rooms.length>0)} onClick={generate}>
            {busy ? "Building…" : <><Sparkles size={15}/> Create baseline &amp; get link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────── */
function Dashboard({ attempts, questions, quizzes, classrooms }) {
  const [selStudent, setSelStudent] = useState(null);

  // Group attempts by student
  const studentMap = useMemo(() => {
    const m = {};
    for (const a of attempts) {
      if (!a.user_id) continue;
      if (!m[a.user_id]) m[a.user_id] = { name: a.student_name, course: a.meta?.course || a.student_course || "—", cu_id: a.meta?.cu_id || a.student_cu_id || "—", attempts: [] };
      m[a.user_id].attempts.push(a);
    }
    return m;
  }, [attempts]);

  const students = Object.entries(studentMap).map(([id, v]) => {
    const profile = computeQAAPFProfile(v.attempts, questions);
    return { id, ...v, profile };
  }).sort((a,b) => (b.profile.overallPct||0)-(a.profile.overallPct||0));

  // Band distribution
  const bandCounts = Q_LEVELS.map(ql => ({
    ...ql,
    count: students.filter(s => s.profile.overallLevel?.level === ql.level).length,
  }));

  const exportCSV = () => downloadCSV("qaapf-cohort.csv", students, [
    { label:"Name",    value:s=>s.name },
    { label:"Course",  value:s=>s.course },
    { label:"CU ID",   value:s=>s.cu_id },
    { label:"Level",   value:s=>s.profile.overallLevel?.level||"N/A" },
    { label:"Label",   value:s=>s.profile.overallLevel?.label||"N/A" },
    { label:"Overall%",value:s=>s.profile.overallPct??0 },
    ...DOMAINS.map(d=>({ label:d.short, value:s=>s.profile.domainProfiles.find(p=>p.id===d.id)?.pct??0 })),
  ]);

  /* Intervention grouping — the single most actionable output of a
     diagnostic. For each domain, who scored below 50%? These are the
     students to pull into a targeted remediation group. A domain with a
     large group is a whole-class teaching gap, not an individual one. */
  const interventionGroups = useMemo(() => {
    return DOMAINS.map(d => {
      const need = students.filter(s => {
        const dp = s.profile.domainProfiles.find(p => p.id === d.id);
        return dp && dp.pct !== null && dp.pct < 50;
      }).sort((a, b) => {
        const pa = a.profile.domainProfiles.find(p=>p.id===d.id)?.pct ?? 0;
        const pb = b.profile.domainProfiles.find(p=>p.id===d.id)?.pct ?? 0;
        return pa - pb;
      });
      const assessed = students.filter(s => {
        const dp = s.profile.domainProfiles.find(p => p.id === d.id);
        return dp && dp.pct !== null;
      }).length;
      return { domain: d, need, assessed, share: assessed ? Math.round(need.length/assessed*100) : 0 };
    }).filter(g => g.need.length > 0).sort((a, b) => b.need.length - a.need.length);
  }, [students]);

  const exportGroup = (g) => downloadCSV(`remediation-${g.domain.short}.csv`, g.need, [
    { label:"Name",   value:s=>s.name },
    { label:"Course", value:s=>s.course },
    { label:"CU ID",  value:s=>s.cu_id },
    { label:`${g.domain.name} %`, value:s=>s.profile.domainProfiles.find(p=>p.id===g.domain.id)?.pct??0 },
    { label:"Overall band", value:s=>s.profile.overallLevel?.level||"—" },
  ]);

  return (
    <div className="space-y-5">
      {/* Band summary */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Cohort distribution across Q-levels</h3>
          {students.length>0 && <button onClick={exportCSV} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13}/> Export</button>}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {bandCounts.map(b => (
            <div key={b.level} className={`rounded-xl border p-3 text-center ${b.light}`}>
              <div className={`text-2xl font-extrabold ${num}`}>{b.count}</div>
              <div className="text-xs font-bold">{b.level}</div>
              <div className="text-[10px]">{b.label}</div>
            </div>
          ))}
        </div>
        {!students.length && <Empty icon={Users} title="No student data yet" hint="Students need to complete QAAPF diagnostic quizzes first."/>}
      </div>

      {/* Intervention groups — who to pull for remediation, by domain */}
      {interventionGroups.length > 0 && (
        <div className={`${card} p-5`}>
          <div className="mb-1 flex items-center gap-2">
            <Layers size={15} className="text-violet-600"/>
            <h3 className="text-sm font-bold text-slate-900">Suggested remediation groups</h3>
          </div>
          <p className="mb-4 text-xs text-slate-400">Students below 50% in each domain. A large group signals a whole-class gap worth reteaching; a small one, targeted support.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {interventionGroups.map(g => (
              <div key={g.domain.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{g.domain.icon}</span>
                    <span className="text-sm font-bold text-slate-800">{g.domain.name}</span>
                  </div>
                  <button onClick={() => exportGroup(g)} className={`${btnG} !py-1 !px-2 !text-[11px]`}><FileDown size={11}/> List</button>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${g.share>=50?"bg-rose-100 text-rose-700":g.share>=25?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-600"}`}>
                    {g.need.length} of {g.assessed} students · {g.share}%
                  </span>
                  {g.share >= 50 && <span className="text-[10px] font-semibold text-rose-600">whole-class gap</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.need.slice(0, 12).map(s => {
                    const pct = s.profile.domainProfiles.find(p=>p.id===g.domain.id)?.pct ?? 0;
                    return (
                      <span key={s.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 text-[11px] text-slate-600">
                        {s.name}
                        <span className={`font-bold ${pct<30?"text-rose-600":"text-amber-600"}`}>{pct}%</span>
                      </span>
                    );
                  })}
                  {g.need.length > 12 && <span className="self-center text-[11px] text-slate-400">+{g.need.length - 12} more</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student table */}
      {students.length > 0 && (
        <div className={`${card} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-3.5"><h4 className="text-sm font-bold text-slate-900">Student profiles</h4></div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Student</th>
                  <th className="px-3 py-2.5 text-left hidden sm:table-cell">Course</th>
                  <th className="px-3 py-2.5 text-center">Level</th>
                  <th className="px-3 py-2.5 text-center">Overall</th>
                  {DOMAINS.map(d=><th key={d.id} className="px-2 py-2.5 text-center hidden lg:table-cell">{d.short}</th>)}
                  <th className="px-3 py-2.5 text-center">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(s => {
                  const lvl = s.profile.overallLevel;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>setSelStudent(s===selStudent?null:s)}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-2.5 text-slate-500 hidden sm:table-cell">{s.course}</td>
                      <td className="px-3 py-2.5 text-center">{lvl ? <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${lvl.light}`}>{lvl.level}</span> : "—"}</td>
                      <td className={`px-3 py-2.5 text-center font-bold ${num} ${lvl ? "" : "text-slate-300"}`}>{s.profile.overallPct !== null ? `${s.profile.overallPct}%` : "—"}</td>
                      {DOMAINS.map(d=>{
                        const dp = s.profile.domainProfiles.find(p=>p.id===d.id);
                        const pct = dp?.pct;
                        return <td key={d.id} className="px-2 py-2.5 text-center hidden lg:table-cell">
                          {pct!==null&&pct!==undefined ? <span className={`font-bold ${num} ${pct>=70?"text-emerald-600":pct>=50?"text-amber-600":"text-rose-600"}`}>{pct}</span> : <span className="text-slate-200">—</span>}
                        </td>;
                      })}
                      <td className="px-3 py-2.5 text-center"><button className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">{selStudent?.id===s.id?"▲ Less":"▼ More"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded student profile card */}
      {selStudent && <StudentProfileCard student={selStudent}/>}
    </div>
  );
}

/* A one-page printable report a teacher can hand or email to a student.
   Same design language as the exam paper printer — a clean print window,
   no dependency — because a proficiency band means nothing to a student
   without the domain breakdown and a concrete "work on this" list. */
function printStudentReport(s) {
  const p = s.profile;
  const lvl = p.overallLevel;
  const esc = t => String(t ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
  const w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to print the report."); return; }

  const domainRows = p.domainProfiles.map(d => {
    const val = d.pct === null ? "—" : `${d.pct}%`;
    const band = d.level ? d.level.level : "—";
    const bar = d.pct === null ? "" : `<div class="bar"><div class="fill ${d.pct>=70?"g":d.pct>=50?"a":"r"}" style="width:${d.pct}%"></div></div>`;
    const note = d.pct === null ? "not assessed" : !d.reliable ? `provisional (${d.total} items)` : d.ceiling ? `clears ${["","easy","medium","hard"][d.ceiling]}` : "";
    return `<tr><td>${d.icon} ${esc(d.name)}</td><td class="v">${val}</td><td>${band}</td><td class="barcell">${bar}</td><td class="note">${note}</td></tr>`;
  }).join("");

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.name)} — Aptitude Report</title><style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { font: 11pt/1.5 Georgia, serif; color: #111; margin: 0; }
    header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end; }
    h1 { font-size: 17pt; margin: 0 0 2px; }
    .sub { font-size: 9.5pt; color: #555; }
    .band { text-align:center; border:2px solid #333; border-radius:10px; padding:6px 14px; }
    .band .lv { font-size: 20pt; font-weight: 800; }
    .band .lb { font-size: 9pt; }
    .desc { font-size: 10pt; color:#333; margin: 4px 0 16px; font-style: italic; }
    table { width:100%; border-collapse: collapse; font-size: 10pt; }
    th { text-align:left; border-bottom:1px solid #999; padding:5px 6px; font-size:8.5pt; text-transform:uppercase; letter-spacing:.04em; color:#555; }
    td { padding:6px; border-bottom:1px solid #eee; vertical-align: middle; }
    td.v { font-weight:700; text-align:right; width:48px; }
    td.barcell { width: 140px; }
    td.note { font-size:8.5pt; color:#666; }
    .bar { height:8px; background:#eee; border-radius:4px; overflow:hidden; }
    .fill { height:100%; }
    .fill.g { background:#059669; } .fill.a { background:#d97706; } .fill.r { background:#dc2626; }
    .cols { display:flex; gap:16px; margin-top:18px; }
    .box { flex:1; border:1px solid #ccc; border-radius:8px; padding:10px 12px; }
    .box h3 { font-size:10pt; margin:0 0 6px; }
    .box p { font-size:9.5pt; margin:2px 0; }
    .plan { margin-top:16px; border:1px solid #333; border-radius:8px; padding:12px; }
    .plan h3 { margin:0 0 6px; font-size:10.5pt; }
    footer { margin-top:22px; border-top:1px solid #bbb; padding-top:7px; font-size:8pt; color:#666; text-align:center; }
  </style></head><body>
    <header>
      <div>
        <h1>${esc(s.name)}</h1>
        <div class="sub">${esc(s.course || "")} ${s.cu_id ? "· " + esc(s.cu_id) : ""} · ${p.totalSeen} questions attempted across ${p.coverage}/8 domains</div>
      </div>
      ${lvl ? `<div class="band"><div class="lv">${lvl.level}</div><div class="lb">${esc(lvl.label)}</div></div>` : ""}
    </header>
    ${lvl ? `<div class="desc">${esc(lvl.desc)}</div>` : ""}
    <table>
      <thead><tr><th>Domain</th><th style="text-align:right">Score</th><th>Band</th><th>Profile</th><th>Note</th></tr></thead>
      <tbody>${domainRows}</tbody>
    </table>
    <div class="cols">
      <div class="box"><h3>Strengths</h3>${p.strengths.length ? p.strengths.map(d=>`<p>${d.icon} ${esc(d.name)} — ${d.pct}%</p>`).join("") : "<p>—</p>"}</div>
      <div class="box"><h3>Development gaps</h3>${p.gaps.length ? p.gaps.map(d=>`<p>${d.icon} ${esc(d.name)} — ${d.pct}%</p>`).join("") : "<p>—</p>"}</div>
    </div>
    ${p.gaps.length ? `<div class="plan"><h3>Suggested focus</h3><p style="font-size:9.5pt;margin:0">Prioritise ${p.gaps.map(d=>esc(d.name)).join(", ")}. Work from the easiest unanswered items upward before attempting harder application questions in these domains.</p></div>` : ""}
    <footer>QuizPro · QAAPF diagnostic · generated ${new Date().toLocaleDateString()} · ${p.reliable ? "" : "PROVISIONAL — based on limited items, retest for a firm placement"}</footer>
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 350);
}

function StudentProfileCard({ student: s }) {
  const lvl = s.profile.overallLevel;
  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
          <p className="text-xs text-slate-500">{s.course} · {s.cu_id} · {s.attempts.length} attempt{s.attempts.length!==1?"s":""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => printStudentReport(s)} className={`${btnG} !py-1.5 !px-3 !text-xs`}><FileDown size={13}/> Report</button>
          {lvl && <div className={`rounded-2xl border px-4 py-2 text-center ${lvl.light}`}><div className="text-xl font-extrabold">{lvl.level}</div><div className="text-xs font-semibold">{lvl.label}</div></div>}
        </div>
      </div>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">{lvl?.desc}</p>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 text-slate-500">
          {s.profile.totalCorrect}/{s.profile.totalSeen} correct · {s.profile.coverage}/8 domains assessed
        </span>
        {!s.profile.reliable && (
          <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 font-semibold text-amber-700">
            Provisional — too few items for a firm placement
          </span>
        )}
      </div>

      {/* Domain bars */}
      <div className="space-y-3">
        {s.profile.domainProfiles.map(d => (
          <div key={d.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">
                {d.icon} {d.name}
                {d.pct !== null && !d.reliable && (
                  <span className="ml-1.5 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[9px] font-normal text-slate-400" title={`Based on only ${d.total} question${d.total===1?"":"s"} — treat as provisional`}>
                    provisional · {d.total}Q
                  </span>
                )}
              </span>
              {d.pct !== null
                ? <div className="flex items-center gap-2">
                    {d.ceiling && <span className="text-[9px] text-slate-400">clears {diffLabel(d.ceiling).toLowerCase()}</span>}
                    <span className={`${num} text-xs font-bold ${d.pct>=70?"text-emerald-600":d.pct>=50?"text-amber-600":"text-rose-600"}`}>{d.pct}%</span>
                    <span className={`text-[10px] font-bold rounded-full border px-1.5 py-0.5 ${d.level?.light}`}>{d.level?.level}</span>
                  </div>
                : <span className="text-[10px] text-slate-300">Not assessed</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              {d.pct !== null && <div className={`h-full rounded-full transition-all ${d.pct>=70?"bg-emerald-500":d.pct>=50?"bg-amber-400":"bg-rose-500"}`} style={{width:`${d.pct}%`}}/>}
            </div>
          </div>
        ))}
      </div>

      {(s.profile.strengths.length > 0 || s.profile.gaps.length > 0) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {s.profile.strengths.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-xs font-bold text-emerald-700 mb-1.5">✓ Strengths</p>
              {s.profile.strengths.map(d=><p key={d.id} className="text-[11px] text-emerald-600">{d.icon} {d.name} — {d.pct}%</p>)}
            </div>
          )}
          {s.profile.gaps.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
              <p className="text-xs font-bold text-rose-700 mb-1.5">⚠ Development gaps</p>
              {s.profile.gaps.map(d=><p key={d.id} className="text-[11px] text-rose-600">{d.icon} {d.name} — {d.pct}%</p>)}
              <p className="text-[10px] text-rose-400 mt-1.5">Recommended: targeted intervention on these domains</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Cohort Heatmap ──────────────────────────────────────────────── */
function CohortHeatmap({ attempts, questions }) {
  const students = useMemo(() => {
    const m = {};
    for (const a of attempts) {
      if (!a.user_id) continue;
      if (!m[a.user_id]) m[a.user_id] = { name: a.student_name, course: a.meta?.course || "—", attempts:[] };
      m[a.user_id].attempts.push(a);
    }
    return Object.values(m).map(s => ({ ...s, profile: computeQAAPFProfile(s.attempts, questions) }));
  }, [attempts, questions]);

  const heat = pct => pct===null?"bg-slate-100 text-slate-300":pct>=80?"bg-emerald-500 text-white":pct>=60?"bg-violet-500 text-white":pct>=40?"bg-amber-400 text-white":"bg-rose-500 text-white";

  if (!students.length) return <div className={`${card} p-10`}><Empty icon={BarChart2} title="No student data yet"/></div>;

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h4 className="text-sm font-bold text-slate-900">Domain heatmap — whole cohort at a glance</h4>
        <p className="text-xs text-slate-400 mt-0.5">🟩 ≥80% (strong) · 🟣 60–79% (proficient) · 🟨 40–59% (developing) · 🟥 &lt;40% (gap)</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left sticky left-0 bg-slate-50">Student</th>
              <th className="px-3 py-2.5 text-center">Overall</th>
              {DOMAINS.map(d=><th key={d.id} className="px-2 py-2.5 text-center" title={d.name}>{d.icon}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((s,i) => (
              <tr key={i}>
                <td className="px-4 py-2 font-medium text-slate-800 sticky left-0 bg-white">{s.name}<div className="text-[10px] text-slate-400">{s.course}</div></td>
                <td className="px-3 py-2 text-center">
                  {s.profile.overallPct !== null
                    ? <span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${heat(s.profile.overallPct)}`}>{s.profile.overallPct}%</span>
                    : "—"}
                </td>
                {DOMAINS.map(d=>{
                  const dp = s.profile.domainProfiles.find(p=>p.id===d.id);
                  const pct = dp?.pct;
                  return <td key={d.id} className="px-2 py-2 text-center">
                    {pct !== null && pct !== undefined
                      ? <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${heat(pct)}`}>{pct}</span>
                      : <span className="text-slate-200">—</span>}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Q-Levels Guide ──────────────────────────────────────────────── */
function LevelsGuide() {
  const cefr = ["A1","A2","B1","B2","C1","C2"];
  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <h3 className="text-sm font-bold text-slate-900 mb-1">How QAAPF levels map to CEFR</h3>
        <p className="text-xs text-slate-500 mb-3">QAAPF is an institutional diagnostic framework grounded in OECD PIAAC Numeracy and PISA Mathematics. The mapping to CEFR is structural — not that Q3 = B1 internationally, but that the 6-band progression mirrors CEFR's logic.</p>
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-slate-700 mb-1">How the score is calculated</p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Items are weighted by difficulty — easy ×1, medium ×1.6, hard ×2.4 — in both the numerator and the denominator.
            A flat percentage cannot separate a student who cleared twenty easy items from one who cleared ten hard ones,
            and locating where competence stops is the entire purpose of the bands. The reported figure is therefore the
            proportion of <em>difficulty</em> mastered, not the proportion of questions answered.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            A domain with fewer than {RELIABLE_MIN} answered items is marked <strong>provisional</strong>. The score is still
            shown, but it should not be read as a proficiency finding until the student has sat more questions in that domain.
          </p>
        </div>
        <div className="grid gap-3">
          {Q_LEVELS.map((ql, i) => (
            <div key={ql.level} className={`flex items-start gap-4 rounded-xl border p-4 ${ql.light}`}>
              <div className="text-center shrink-0">
                <div className="text-lg font-extrabold">{ql.level}</div>
                <div className="text-[10px] font-semibold">{ql.label}</div>
                <div className="text-[9px] text-slate-400 mt-1">≈ CEFR {cefr[i]}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-700 mb-1">{ql.min}–{ql.max}% on diagnostic</div>
                <p className="text-[11px] leading-relaxed text-slate-600">{ql.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`${card} p-5`}>
        <h3 className="text-sm font-bold text-slate-900 mb-3">8 Domains assessed</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOMAINS.map(d => (
            <div key={d.id} className={`${cardH} p-3`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{d.icon}</span>
                <span className="text-xs font-bold text-slate-900">Domain {d.id}: {d.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {d.units.map(u=><span key={u} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">{u}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Question Inventory ──────────────────────────────────────────── */
function QuestionInventory({ questions, setQuestions, toast2 }) {
  const [filter, setFilter] = useState("all");
  const [importing, setImporting] = useState(false);

  // Check which built-in questions are already in the bank
  const bankedTexts = useMemo(() => new Set(questions.map(q=>q.question.trim().toLowerCase())), [questions]);
  const notBanked   = useMemo(() => QAAPF_QUESTIONS.filter(q => !bankedTexts.has(q.q.trim().toLowerCase())), [bankedTexts]);
  const banked      = useMemo(() => QAAPF_QUESTIONS.filter(q =>  bankedTexts.has(q.q.trim().toLowerCase())), [bankedTexts]);

  const filtered = filter==="all" ? QAAPF_QUESTIONS
    : filter==="new" ? notBanked
    : QAAPF_QUESTIONS.filter(q => q.d === filter);

  const domainCounts = DOMAINS.map(d => ({
    ...d,
    total: QAAPF_QUESTIONS.filter(q=>q.d===d.id).length,
    added: QAAPF_QUESTIONS.filter(q=>q.d===d.id && bankedTexts.has(q.q.trim().toLowerCase())).length,
  }));

  const importDomain = async (domainId) => {
    setImporting(true);
    const toAdd = QAAPF_QUESTIONS.filter(q => q.d === domainId && !bankedTexts.has(q.q.trim().toLowerCase()));
    if (!toAdd.length) { toast2("All questions in this domain are already in the bank.","amber"); setImporting(false); return; }
    try {
      const rows = toAdd.map(q => ({
        subject: "Aptitude",
        unit: q.u,
        topic: q.t,
        question: q.q,
        options: q.o,
        correct: q.c,
        difficulty: diffLabel(q.lv).toLowerCase(),
        points: 1,
      }));
      const inserted = await insertQuestions(rows);
      setQuestions(prev => [...prev, ...inserted]);
      toast2(`Added ${inserted.length} questions from Domain ${domainId} to the bank.`);
    } catch(e) { toast2(e.message,"rose"); }
    setImporting(false);
  };

  const importAll = async () => {
    setImporting(true);
    if (!notBanked.length) { toast2("All QAAPF questions are already in the bank.","amber"); setImporting(false); return; }
    try {
      const rows = notBanked.map(q => ({
        subject: "Aptitude",
        unit: q.u,
        topic: q.t,
        question: q.q,
        options: q.o,
        correct: q.c,
        difficulty: diffLabel(q.lv).toLowerCase(),
        points: 1,
      }));
      const inserted = await insertQuestions(rows);
      setQuestions(prev => [...prev, ...inserted]);
      toast2(`Imported ${inserted.length} questions into the question bank.`);
    } catch(e) { toast2(e.message,"rose"); }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      {/* Domain progress */}
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Question inventory</h3>
            <p className="text-xs text-slate-500 mt-0.5">{banked.length} of {QAAPF_QUESTIONS.length} built-in questions added to your bank</p>
          </div>
          <button onClick={importAll} disabled={importing||!notBanked.length} className={`${btnP} gap-2`}>
            <Plus size={14}/>{importing?"Importing…":`Import all ${notBanked.length} new`}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {domainCounts.map(d => (
            <div key={d.id} className={`${card} p-3 flex items-center justify-between gap-2`}>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800">{d.icon} Domain {d.id}</div>
                <div className="text-[10px] text-slate-500">{d.short}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{width:`${d.total?Math.round(d.added/d.total*100):0}%`}}/>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{d.added}/{d.total} added</div>
              </div>
              {d.added < d.total && (
                <button onClick={()=>importDomain(d.id)} disabled={importing} className="shrink-0 rounded-xl bg-violet-50 p-1.5 text-violet-600 hover:bg-violet-100 transition" title={`Import Domain ${d.id}`}>
                  <Plus size={14}/>
                </button>
              )}
              {d.added === d.total && <CheckCircle2 size={16} className="shrink-0 text-emerald-500"/>}
            </div>
          ))}
        </div>
      </div>

      {/* Question list */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-100 p-4 flex flex-wrap items-center gap-2">
          <button onClick={()=>setFilter("all")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter==="all"?"bg-violet-600 text-white":"bg-slate-100 text-slate-600"}`}>All ({QAAPF_QUESTIONS.length})</button>
          <button onClick={()=>setFilter("new")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter==="new"?"bg-violet-600 text-white":"bg-slate-100 text-slate-600"}`}>Not imported ({notBanked.length})</button>
          {DOMAINS.map(d=><button key={d.id} onClick={()=>setFilter(d.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter===d.id?"bg-violet-600 text-white":"bg-slate-100 text-slate-600"}`}>{d.icon} {d.id}</button>)}
        </div>
        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
          {filtered.map((q, i) => {
            const inBank = bankedTexts.has(q.q.trim().toLowerCase());
            const dom = DOMAINS.find(d=>d.id===q.d);
            return (
              <div key={i} className={`px-4 py-3 flex items-start gap-3 ${inBank?"bg-emerald-50/30":""}`}>
                <span className="shrink-0 text-sm">{dom?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge tone="violet">{q.d}</Badge>
                    <Badge tone="sky">{q.u}</Badge>
                    <Badge tone={diffTone(q.lv)}>{diffLabel(q.lv)}</Badge>
                    {inBank && <Badge tone="emerald">In bank</Badge>}
                  </div>
                  <p className="text-xs font-medium text-slate-800">{q.q}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {q.o.map((o,oi)=><span key={oi} className={`text-[10px] ${oi===q.c?"font-semibold text-emerald-700":"text-slate-400"}`}>{oi===q.c?"✓ ":""}{o}</span>)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
