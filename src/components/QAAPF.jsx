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


/* ── Expansion v2: Domain A ─────────────────────────────────── */
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The sum of all prime numbers between 10 and 20 is:", o:["60", "52", "41", "55"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The largest 3-digit number divisible by 17 is:", o:["986", "999", "952", "969"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"How many numbers between 1 and 100 are divisible by both 3 and 5?", o:["6", "5", "7", "10"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The unit digit of 7^35 is:", o:["3", "7", "9", "1"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"If a number when divided by 5 leaves remainder 3, its unit digit could be:", o:["8", "5", "6", "2"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The sum of the first 15 odd numbers is:", o:["225", "240", "210", "256"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"A number is divisible by 11 if the difference of alternate digit sums is:", o:["A multiple of 11", "Even", "Odd", "Zero only"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The smallest number divisible by 2,3,4,5 and 6 is:", o:["60", "120", "30", "90"], c:0, lv:2 },
{ d:"A", u:"Fractions", t:"Fractions", q:"7/12 - 1/4 + 1/3 = ?", o:["2/3", "5/12", "3/4", "1/2"], c:0, lv:2 },
{ d:"A", u:"Fractions", t:"Fractions", q:"If 3/5 of a number exceeds 2/5 of it by 20, the number is:", o:["100", "80", "120", "90"], c:0, lv:2 },
{ d:"A", u:"Fractions", t:"Fractions", q:"The reciprocal of (2/3 + 3/4) is:", o:["12/17", "17/12", "5/7", "7/5"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"0.6 × 0.6 × 0.6 = ?", o:["0.216", "0.36", "0.018", "0.0216"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"Which is largest: 0.7, 0.07, 0.77, 0.707?", o:["0.77", "0.7", "0.707", "0.07"], c:0, lv:2 },
{ d:"A", u:"Decimals", t:"Decimals", q:"3.6 ÷ 0.12 = ?", o:["30", "3", "300", "0.3"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Evaluate: 15 - 3 × 4 + 20 ÷ 5", o:["7", "-1", "11", "3"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Solve: (8 + 2) × 3 - 4²", o:["14", "26", "2", "10"], c:0, lv:2 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Simplify: 36 ÷ 6 + 2 × 5 - 3", o:["13", "17", "8", "10"], c:0, lv:2 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximate value of 1002 ÷ 49 is:", o:["20", "22", "18", "25"], c:0, lv:2 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximate: 48% of 1250 + 12% of 500", o:["660", "600", "720", "640"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The HCF of 108 and 144 is:", o:["36", "24", "18", "48"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The LCM of 15, 20 and 25 is:", o:["300", "150", "200", "250"], c:0, lv:2 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"How many two-digit numbers are divisible by 6?", o:["15", "16", "14", "12"], c:0, lv:2 },
{ d:"A", u:"Fractions", t:"Fractions", q:"3/8 of 512 is:", o:["192", "160", "208", "176"], c:0, lv:2 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The unit digit of 13^99 + 17^99 is:", o:["0", "6", "4", "8"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The remainder when 2^100 is divided by 7 is:", o:["2", "1", "4", "0"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"How many trailing zeros does 25! have?", o:["6", "5", "4", "7"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The largest number that divides 245, 1029 and 1421 exactly is:", o:["49", "7", "21", "35"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"If N = 2^3 × 3^2 × 5, the number of factors of N is:", o:["24", "12", "18", "20"], c:0, lv:3 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The sum of all numbers from 1 to 100 that are NOT divisible by 5 is:", o:["4000", "4050", "3950", "4100"], c:0, lv:3 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"A number leaves remainder 4 when divided by 7 and remainder 3 when divided by 5. The smallest such number is:", o:["18", "23", "32", "11"], c:0, lv:3 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The product of two numbers is 2028 and their HCF is 13. How many such pairs exist?", o:["2", "1", "3", "4"], c:0, lv:3 },
{ d:"A", u:"Fractions", t:"Fractions", q:"If (x + 1/x)² = 9, then x² + 1/x² equals:", o:["7", "9", "11", "5"], c:0, lv:3 },
{ d:"A", u:"Fractions", t:"Fractions", q:"A tank is 3/7 full. After adding 22 litres it becomes 5/7 full. Tank capacity is:", o:["77 litres", "70 litres", "84 litres", "66 litres"], c:0, lv:3 },
{ d:"A", u:"Decimals", t:"Decimals", q:"The value of 0.001728^(1/3) is:", o:["0.12", "0.012", "1.2", "0.0012"], c:0, lv:3 },
{ d:"A", u:"Decimals", t:"Decimals", q:"If 1.5x = 0.04y, then x/y equals:", o:["4/150", "150/4", "2/75", "75/2"], c:0, lv:3 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Solve: [(6 + 4²) ÷ 2 - 3] × 2 + 5", o:["21", "19", "23", "17"], c:0, lv:3 },
{ d:"A", u:"BODMAS", t:"BODMAS", q:"Evaluate: 2 + 2 × 2² - 2³ ÷ 2", o:["6", "4", "8", "2"], c:0, lv:3 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximate: √(4096) + √(2025)", o:["109", "110", "108", "111"], c:0, lv:3 },
{ d:"A", u:"Approximation", t:"Approximation", q:"Approximate value of (39.8% of 599) ÷ 4.02", o:["60", "55", "65", "50"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"The sum of digits of the smallest 4-digit number divisible by 88 is:", o:["9", "10", "8", "11"], c:0, lv:3 },
{ d:"A", u:"Number Sense", t:"Number Sense", q:"How many numbers between 100 and 400 are divisible by 7 but not 3?", o:["29", "43", "14", "36"], c:0, lv:3 },
{ d:"A", u:"Whole Numbers", t:"Whole Numbers", q:"The last two digits of 7^2008 are:", o:["01", "07", "49", "43"], c:0, lv:3 },
{ d:"A", u:"Fractions", t:"Fractions", q:"If a/b = 3/4 and b/c = 8/9, then a:b:c is:", o:["6:8:9", "3:4:9", "3:8:9", "6:8:12"], c:0, lv:3 },
{ d:"A", u:"Decimals", t:"Decimals", q:"0.overline{3} + 0.overline{6} (recurring) equals:", o:["1", "0.9", "0.99", "0.overline{9}"], c:0, lv:3 },

/* ── Expansion v2: Domain B ─────────────────────────────────── */
{ d:"B", u:"Percentages", t:"Percentages", q:"If 40% of a number is 240, then 65% of the same number is:", o:["390", "360", "420", "400"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"A number increased by 25% then decreased by 20% gives 400. Original number:", o:["400", "420", "380", "450"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"In an election of two candidates, the winner got 60% and won by 900 votes. Total votes:", o:["4500", "3600", "5400", "4000"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"If price rises 20%, a family reduces consumption so spending rises only 8%. Consumption cut is:", o:["10%", "12%", "8%", "15%"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"30% of 40% of 500 is:", o:["60", "70", "50", "80"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A man sells two articles at ₹99 each, gaining 10% on one and losing 10% on the other. Net result:", o:["Loss of ₹2", "Gain of ₹2", "No profit no loss", "Loss of ₹1"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"On selling at ₹720, a shopkeeper loses 10%. To gain 10%, he should sell at:", o:["₹880", "₹800", "₹864", "₹900"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"CP of 12 pens = SP of 10 pens. Gain percent is:", o:["20%", "16.67%", "25%", "10%"], c:0, lv:2 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A shopkeeper marks up 50% and gives 20% discount. Profit percent is:", o:["20%", "30%", "25%", "15%"], c:0, lv:2 },
{ d:"B", u:"Discount", t:"Discount", q:"Two successive discounts of 10% and 20% on ₹500 give a final price of:", o:["₹360", "₹350", "₹400", "₹340"], c:0, lv:2 },
{ d:"B", u:"Discount", t:"Discount", q:"A single discount equal to two successive discounts of 15% and 15% is:", o:["27.75%", "30%", "28%", "25%"], c:0, lv:2 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"SI on ₹7,200 at 6.25% per annum for 2 years is:", o:["₹900", "₹850", "₹920", "₹880"], c:0, lv:2 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"At what rate will ₹1,200 amount to ₹1,440 in 4 years (SI)?", o:["5%", "4%", "6%", "4.5%"], c:0, lv:2 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"The CI on ₹12,000 at 10% for 2 years is:", o:["₹2,520", "₹2,400", "₹2,600", "₹2,420"], c:0, lv:2 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"In how many years will ₹5,000 become ₹6,050 at 10% CI?", o:["2", "3", "4", "2.5"], c:0, lv:2 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"If A:B = 3:4 and B:C = 6:5, then A:B:C is:", o:["9:12:10", "3:4:5", "18:24:20", "6:8:5"], c:0, lv:2 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"₹5,600 divided among A, B, C in ratio 1:3:4. C's share:", o:["₹2,800", "₹2,100", "₹1,400", "₹2,400"], c:0, lv:2 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"The ratio 2.5:1.5 in simplest form is:", o:["5:3", "3:2", "4:3", "2:1"], c:0, lv:2 },
{ d:"B", u:"Averages", t:"Averages", q:"The average of 6 numbers is 30. If one number is removed, the average becomes 28. The removed number is:", o:["40", "36", "42", "38"], c:0, lv:2 },
{ d:"B", u:"Averages", t:"Averages", q:"The average age of 30 students is 15. With the teacher, it becomes 16. Teacher's age:", o:["46", "45", "48", "44"], c:0, lv:2 },
{ d:"B", u:"Averages", t:"Averages", q:"Average of first 10 multiples of 7 is:", o:["38.5", "35", "42", "40"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"55% of 620 - 25% of 480 is:", o:["221", "231", "211", "241"], c:0, lv:2 },
{ d:"B", u:"Percentages", t:"Percentages", q:"A's salary is 25% more than B's. By what percent is B's salary less than A's?", o:["20%", "25%", "15%", "30%"], c:0, lv:3 },
{ d:"B", u:"Percentages", t:"Percentages", q:"The population of a town increases 10% in year 1 and decreases 10% in year 2. Net change is:", o:["1% decrease", "No change", "1% increase", "2% decrease"], c:0, lv:3 },
{ d:"B", u:"Percentages", t:"Percentages", q:"In an exam 42% failed in Maths, 52% in English, 17% in both. Percent who passed in both:", o:["23%", "25%", "20%", "27%"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"By selling 33 metres of cloth a trader gains the SP of 11 metres. Gain percent is:", o:["50%", "33.3%", "25%", "40%"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A dishonest dealer claims to sell at cost but uses a 800g weight for 1kg. His gain percent is:", o:["25%", "20%", "12.5%", "33.3%"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A sells to B at 20% profit, B sells to C at 25% profit. If C pays ₹225, A's cost was:", o:["₹150", "₹160", "₹180", "₹140"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"A trader mixes 26 kg rice at ₹20 with 30 kg at ₹36 and sells at ₹30/kg. Profit percent is:", o:["~4.2%", "~5%", "~6%", "~3%"], c:0, lv:3 },
{ d:"B", u:"Discount", t:"Discount", q:"A shopkeeper allows 20% discount and still gains 12%. If CP is ₹1,400, the marked price is:", o:["₹1,960", "₹1,880", "₹2,000", "₹1,900"], c:0, lv:3 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"A sum triples in 12 years at simple interest. The rate per annum is:", o:["16.67%", "12.5%", "20%", "15%"], c:0, lv:3 },
{ d:"B", u:"Simple Interest", t:"Simple Interest", q:"A sum of ₹2,600 is split so SI at 10% on one part for 5 years equals SI at 9% on the other for 6 years. Larger part is:", o:["₹1,350", "₹1,250", "₹1,400", "₹1,300"], c:2, lv:3 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"The difference between CI and SI on a sum at 5% for 2 years is ₹15. The sum is:", o:["₹6,000", "₹5,000", "₹7,000", "₹6,500"], c:0, lv:3 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"A sum becomes ₹8,820 in 2 years at 5% CI. The principal is:", o:["₹8,000", "₹8,400", "₹7,800", "₹8,200"], c:0, lv:3 },
{ d:"B", u:"Compound Interest", t:"Compound Interest", q:"If ₹P amounts to ₹P×1.331 in 3 years at CI, the annual rate is:", o:["10%", "11%", "33.1%", "9%"], c:0, lv:3 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"Two numbers are in ratio 5:8. If 9 is subtracted from each, the ratio becomes 2:5. The larger number is:", o:["24", "15", "16", "20"], c:0, lv:3 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"₹782 is divided among A, B, C such that A:B = 2:3 and B:C = 4:5. B's share is:", o:["₹276", "₹184", "₹322", "₹230"], c:0, lv:3 },
{ d:"B", u:"Ratio & Proportion", t:"Ratio & Proportion", q:"The incomes of A and B are in ratio 4:3 and expenditures 3:2. If each saves ₹600, A's income is:", o:["₹2,400", "₹1,800", "₹3,000", "₹2,000"], c:0, lv:3 },
{ d:"B", u:"Averages", t:"Averages", q:"The average of 11 results is 60. The average of the first 6 is 58 and the last 6 is 63. The 6th result is:", o:["66", "64", "62", "60"], c:0, lv:3 },
{ d:"B", u:"Averages", t:"Averages", q:"A batsman in his 17th innings makes 85 and raises his average by 3. His new average is:", o:["37", "34", "40", "35"], c:0, lv:3 },
{ d:"B", u:"Averages", t:"Averages", q:"The average of 5 consecutive even numbers is 42. The largest is:", o:["46", "44", "48", "50"], c:0, lv:3 },
{ d:"B", u:"Percentages", t:"Percentages", q:"If 20% of A = 30% of B = 40% of C, then A:B:C is:", o:["6:4:3", "2:3:4", "3:4:6", "4:6:3"], c:0, lv:3 },
{ d:"B", u:"Profit & Loss", t:"Profit & Loss", q:"An item is sold at 25% profit. Had it been bought at 20% less and sold for ₹10.50 less, profit would still be 30%. Cost price:", o:["₹50", "₹40", "₹60", "₹45"], c:0, lv:3 },

/* ── Expansion v2: Domain C ─────────────────────────────────── */
{ d:"C", u:"Number Series", t:"Number Series", q:"4, 9, 19, 39, 79, ?", o:["159", "119", "139", "99"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"6, 11, 21, 36, 56, ?", o:["81", "76", "71", "86"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"2, 6, 18, 54, ?", o:["162", "108", "216", "144"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"1, 4, 27, 256, ?", o:["3125", "625", "1024", "512"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"5, 6, 9, 14, 21, ?", o:["30", "28", "32", "27"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"100, 96, 88, 76, 60, ?", o:["40", "44", "48", "36"], c:0, lv:2 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"If 2 @ 3 = 13 and 3 @ 4 = 25, then 4 @ 5 = ?", o:["41", "39", "45", "37"], c:0, lv:2 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"Fill: 7, 14, 28, __, 112", o:["56", "42", "49", "64"], c:0, lv:2 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Compare A = 3/8 of 240, B = 30% of 300", o:["A = B", "A > B", "B > A", "Cannot determine"], c:0, lv:2 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Which is greatest: 2^10, 10^3, 3^7?", o:["3^7", "2^10", "10^3", "All equal"], c:0, lv:2 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate: 6.98 × 14.02 + 29.9", o:["128", "120", "135", "115"], c:0, lv:2 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate 79.9% of 449.5", o:["360", "400", "340", "380"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A is 5 years older than B. In 5 years the sum of their ages will be 45. B's present age:", o:["15", "17", "13", "20"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A shopkeeper buys 6 apples for ₹10 and sells 5 for ₹10. Gain percent is:", o:["20%", "16.67%", "25%", "15%"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"If 8 men do a job in 12 days, how many days for 6 men at the same rate?", o:["16", "14", "18", "10"], c:0, lv:2 },
{ d:"C", u:"Mathematical Patterns", t:"Patterns", q:"In 1, 3, 6, 10, 15 the differences form:", o:["Consecutive integers", "Squares", "Even numbers", "Primes"], c:0, lv:2 },
{ d:"C", u:"Mathematical Patterns", t:"Patterns", q:"Odd one out: 8, 27, 64, 100, 125", o:["100", "64", "27", "8"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"3, 5, 9, 17, 33, ?", o:["65", "49", "57", "63"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"64, 32, 16, 8, ?", o:["4", "2", "6", "5"], c:0, lv:2 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"5 × 4 - 3 = ? and pattern gives 6 × 5 - 4 = 26; so 7 × 6 - 5 = ?", o:["37", "35", "42", "40"], c:0, lv:2 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate: √624 + √99", o:["35", "32", "38", "30"], c:0, lv:2 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A car travels 60 km in 45 minutes. Its speed in km/h is:", o:["80", "75", "90", "70"], c:0, lv:2 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Compare A = 15% of 80, B = 8% of 150", o:["A = B", "A > B", "B > A", "Cannot determine"], c:0, lv:2 },
{ d:"C", u:"Number Series", t:"Number Series", q:"2, 3, 10, 15, 26, ?", o:["35", "33", "37", "31"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"1, 2, 6, 21, 88, ?", o:["445", "365", "525", "404"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"7, 26, 63, 124, 215, ?", o:["342", "316", "330", "300"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"3, 8, 15, 24, 35, ?", o:["48", "45", "50", "46"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"0, 6, 24, 60, 120, ?", o:["210", "180", "200", "240"], c:0, lv:3 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"If 6 * 2 = 40 and 8 * 3 = 55, then 9 * 4 = ? (a*b = a²+b×2)", o:["89", "81", "85", "93"], c:0, lv:3 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"In a magic square each row sums 15. If a row has 8 and 1, the third is:", o:["6", "5", "7", "4"], c:0, lv:3 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Which is largest: 0.4^2, 0.4, √0.4?", o:["√0.4", "0.4", "0.4^2", "All equal"], c:0, lv:3 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate: (1234 × 89) ÷ 987", o:["111", "100", "125", "95"], c:0, lv:3 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Approximate compound growth: ₹1000 at ~7% for 10 years is about:", o:["₹1,967", "₹1,700", "₹2,500", "₹1,400"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A can do a work in 10 days, B in 15 days. Working together they finish in:", o:["6 days", "5 days", "8 days", "7.5 days"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"A train 300 m long crosses a platform 500 m long in 40 s. Its speed in km/h is:", o:["72", "60", "80", "66"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"The ages of A and B are in ratio 5:7. Four years ago the ratio was 4:6. B's present age:", o:["28", "21", "24", "35"], c:0, lv:3 },
{ d:"C", u:"Multi-step Reasoning", t:"Multi-step", q:"Two pipes fill a tank in 20 and 30 min. A drain empties it in 40 min. All open, time to fill:", o:["120/7 min", "24 min", "30 min", "20 min"], c:0, lv:3 },
{ d:"C", u:"Mathematical Patterns", t:"Patterns", q:"Odd one out: 121, 143, 169, 196, 225", o:["143", "121", "169", "196"], c:0, lv:3 },
{ d:"C", u:"Number Series", t:"Number Series", q:"4, 18, 48, 100, 180, ?", o:["294", "270", "250", "310"], c:0, lv:3 },
{ d:"C", u:"Missing Numbers", t:"Missing Numbers", q:"If FACE = 21 (letter positions summed) then HEAD = ?", o:["22", "20", "24", "18"], c:0, lv:3 },
{ d:"C", u:"Quantitative Comparisons", t:"QC", q:"Compare A = 1/2 + 1/3 + 1/6, B = 3/4 + 1/4", o:["A = B", "A > B", "B > A", "Cannot determine"], c:0, lv:3 },
{ d:"C", u:"Estimation", t:"Estimation", q:"Estimate: 48.9% of 1219 ÷ 5.98", o:["100", "120", "90", "110"], c:0, lv:3 },

/* ── Expansion v2: Domain D ─────────────────────────────────── */
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Expand (2x + 3)²:", o:["4x² + 12x + 9", "4x² + 9", "2x² + 12x + 9", "4x² + 6x + 9"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Factorise x² + 7x + 12:", o:["(x+3)(x+4)", "(x+2)(x+6)", "(x+1)(x+12)", "(x+5)(x+2)"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If 2ᵃ = 32, then a =", o:["5", "4", "6", "3"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Simplify (x⁵ × x³) ÷ x²:", o:["x⁶", "x⁴", "x¹⁰", "x⁸"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If a + b = 7 and ab = 12, then a² + b² =", o:["25", "24", "37", "13"], c:0, lv:2 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Solve 3(x - 2) = 2(x + 5):", o:["16", "10", "8", "14"], c:0, lv:2 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"The sum of two numbers is 40 and difference 8. The larger is:", o:["24", "20", "28", "32"], c:0, lv:2 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Solve for x: x/2 + x/3 = 10", o:["12", "10", "15", "8"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"2x + y = 11 and x + 2y = 13. Find x + y.", o:["8", "6", "10", "12"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"3 pens and 2 books cost ₹80; 2 pens and 3 books cost ₹95. One book costs:", o:["₹25", "₹20", "₹22", "₹18"], c:0, lv:2 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"Solve 4x - 7 > 2x + 5:", o:["x > 6", "x < 6", "x > 3", "x < 3"], c:0, lv:2 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"If 3 ≤ 2x - 1 ≤ 9, then x lies in:", o:["[2, 5]", "[1, 4]", "[3, 6]", "[2, 4]"], c:0, lv:2 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = 2x + 1, find f(f(2)):", o:["11", "9", "7", "13"], c:0, lv:2 },
{ d:"D", u:"Functions", t:"Algebra", q:"A line has slope 2 and passes through (1, 5). Its y-intercept is:", o:["3", "2", "5", "4"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Simplify: (a + b)² - (a - b)²", o:["4ab", "2ab", "2a²", "4a²"], c:0, lv:2 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Five times a number decreased by 8 equals 37. The number is:", o:["9", "7", "8", "10"], c:0, lv:2 },
{ d:"D", u:"Functions", t:"Algebra", q:"If g(x) = x² - 3, then g(-2) =", o:["1", "7", "-1", "4"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If x - 1/x = 3, then x² + 1/x² =", o:["11", "9", "7", "13"], c:0, lv:2 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"How many integers satisfy -3 < 2x + 1 ≤ 7?", o:["3", "4", "5", "2"], c:0, lv:2 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"x + y = 10, xy = 21. The values of x and y are:", o:["3 and 7", "4 and 6", "5 and 5", "2 and 8"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Factorise 2x² - 8:", o:["2(x-2)(x+2)", "2(x²-4)", "(2x-4)(x+2)", "(x-2)(2x+4)"], c:0, lv:2 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = 3x - 2 and f(a) = 10, then a =", o:["4", "3", "5", "6"], c:0, lv:2 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If x + 1/x = 4, find x³ + 1/x³:", o:["52", "64", "48", "60"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If a² + b² = 41 and ab = 20, then a + b =", o:["9", "7", "11", "8"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"Simplify: (x² - 5x + 6)/(x - 2)", o:["x - 3", "x - 2", "x + 3", "x - 6"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If 3ˣ = 5ʸ = 15ᶻ, then 1/x + 1/y equals:", o:["1/z", "z", "2/z", "1/(2z)"], c:0, lv:3 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"A two-digit number is 4 times its unit digit's sum with tens. If digits reversed it increases by 18, the number is:", o:["24", "42", "36", "13"], c:0, lv:3 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"The present age of a father is 3 times his son. After 12 years it will be twice. Father's present age:", o:["36", "30", "42", "48"], c:0, lv:3 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"x + y + z = 6, x + 2y + 3z = 14, x + 3y + 5z = 22. Find z.", o:["4", "2", "3", "5"], c:0, lv:3 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"The cost of 2 kg apples and 3 kg oranges is ₹240; 3 kg apples and 2 kg oranges cost ₹260. Cost of 1 kg apples:", o:["₹60", "₹48", "₹52", "₹56"], c:0, lv:3 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"The solution of x² - 5x + 6 < 0 is:", o:["2 < x < 3", "x < 2 or x > 3", "x > 3", "-3 < x < -2"], c:0, lv:3 },
{ d:"D", u:"Inequalities", t:"Algebra", q:"For how many integer values of x is |x - 3| < 4?", o:["7", "6", "8", "5"], c:0, lv:3 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = (x+1)/(x-1), find f(f(x)):", o:["x", "1/x", "-x", "x+1"], c:0, lv:3 },
{ d:"D", u:"Functions", t:"Algebra", q:"A quadratic f(x) = x² + bx + c has roots 2 and 5. Then b + c =", o:["3", "10", "-7", "17"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If 2ˣ + 2ˣ + 2ˣ + 2ˣ = 2⁸, then x =", o:["6", "5", "7", "4"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"The value of (1.5)³ - (0.5)³ - 3×1.5×0.5×1 is:", o:["1", "2", "0.5", "1.5"], c:0, lv:3 },
{ d:"D", u:"Linear Equations", t:"Algebra", q:"Ravi's age plus twice Sita's is 42. Sita's age plus twice Ravi's is 51. Ravi's age:", o:["20", "15", "18", "22"], c:0, lv:3 },
{ d:"D", u:"Simultaneous Equations", t:"Algebra", q:"If x/2 = y/3 = z/5 and x + y + z = 50, then z =", o:["25", "15", "20", "30"], c:0, lv:3 },
{ d:"D", u:"Functions", t:"Algebra", q:"If f(x) = ax + b, f(1) = 4 and f(3) = 10, then a + b =", o:["4", "6", "3", "5"], c:0, lv:3 },
{ d:"D", u:"Basic Algebra", t:"Algebra", q:"If p + q = 10 and p² + q² = 58, then pq =", o:["21", "24", "18", "20"], c:0, lv:3 },

/* ── Expansion v2: Domain E ─────────────────────────────────── */
{ d:"E", u:"Tables", t:"Tables", q:"Marks: A=72, B=85, C=68, D=90, E=75. The average is:", o:["78", "76", "80", "74"], c:0, lv:2 },
{ d:"E", u:"Tables", t:"Tables", q:"Sales(₹L): Q1=45,Q2=60,Q3=55,Q4=80. Q4 as percent of total:", o:["33.3%", "30%", "35%", "40%"], c:0, lv:2 },
{ d:"E", u:"Tables", t:"Tables", q:"A company's expenses: Salary 40%, Rent 15%, Materials 30%, Other 15% of ₹20L. Materials cost:", o:["₹6L", "₹5L", "₹4L", "₹8L"], c:0, lv:2 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"A bar chart shows profit: 2021=₹30L,2022=₹45L. Percent growth is:", o:["50%", "33%", "40%", "45%"], c:0, lv:2 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Production(units): Jan=200,Feb=250,Mar=300,Apr=350. Average monthly production:", o:["275", "250", "300", "280"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"A 360° pie has a 90° sector for Marketing on a ₹8L budget. Marketing spend:", o:["₹2L", "₹1.5L", "₹2.5L", "₹3L"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"A sector for 35% corresponds to how many degrees?", o:["126°", "120°", "130°", "140°"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"Temperature rose from 20°C to 32°C over 6 hours steadily. Rise per hour:", o:["2°C", "1.5°C", "3°C", "2.5°C"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"Visitors: Mon=100, doubling daily. Wednesday's count:", o:["400", "300", "200", "500"], c:0, lv:2 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"Revenue fell from ₹250L to ₹200L. Percent decline:", o:["20%", "25%", "15%", "30%"], c:0, lv:2 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"A stock rose 25% then fell 20%. Net change:", o:["0%", "5% up", "5% down", "10% up"], c:0, lv:2 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Sales grew 20% per year from ₹100L. After 2 years:", o:["₹144L", "₹140L", "₹120L", "₹148L"], c:0, lv:2 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Four shops earn 200/300/250/350 with costs 60% each. Highest profit shop:", o:["Shop 4", "Shop 2", "Shop 3", "Shop 1"], c:0, lv:2 },
{ d:"E", u:"Tables", t:"Tables", q:"Runs: Over1=8,Over2=12,Over3=6,Over4=14. Required run rate over 4 overs:", o:["10", "12", "8", "9"], c:0, lv:2 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Rainfall(mm): W1=40,W2=60,W3=20,W4=80. Range is:", o:["60", "40", "80", "70"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"In a ₹5L budget pie, HR=72°. HR's amount:", o:["₹1L", "₹1.2L", "₹0.8L", "₹1.5L"], c:0, lv:2 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"Price of ₹80 becomes ₹100. Percent increase:", o:["25%", "20%", "30%", "15%"], c:0, lv:2 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Users grew from 5000 to 6000 in a year. Growth rate:", o:["20%", "15%", "25%", "10%"], c:0, lv:2 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Dept budgets A=₹3L,B=₹5L,C=₹2L,D=₹10L. B's share of total:", o:["25%", "30%", "20%", "28%"], c:0, lv:2 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"A graph is flat then rises sharply. This shows:", o:["Sudden increase after stability", "Steady decline", "Constant value", "Cyclic pattern"], c:0, lv:2 },
{ d:"E", u:"Tables", t:"Tables", q:"Scores 60,70,80,90,100. Median score:", o:["80", "75", "85", "70"], c:0, lv:2 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"If Food is 25% and Transport 15% of a pie, together they span:", o:["144°", "120°", "150°", "135°"], c:0, lv:2 },
{ d:"E", u:"Tables", t:"Tables", q:"Data: A produces 400 at ₹12 cost, sells ₹18. B produces 300 at ₹10, sells ₹16. Whose total profit is higher and by how much?", o:["A by ₹600", "B by ₹600", "A by ₹400", "Equal"], c:0, lv:3 },
{ d:"E", u:"Tables", t:"Tables", q:"In a table, imports rose 20% and exports 30%. If imports were ₹500L and exports ₹400L, the new trade gap (imports-exports) is:", o:["₹80L", "₹100L", "₹60L", "₹120L"], c:0, lv:3 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Profit(₹L): 2019=20,2020=25,2021=20,2022=30. The year with highest percent growth over the previous year:", o:["2022", "2020", "2021", "2019"], c:0, lv:3 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Two bars: Revenue=₹120L, Cost=₹90L. If revenue rises 25% and cost 20%, new profit is:", o:["₹42L", "₹40L", "₹45L", "₹38L"], c:0, lv:3 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"In a ₹12L budget pie, if R&D increases from 60° to 90°, the extra R&D amount is:", o:["₹1L", "₹1.5L", "₹2L", "₹0.5L"], c:0, lv:3 },
{ d:"E", u:"Pie Charts", t:"Pie Charts", q:"Two categories are 108° and 72°. If the first represents ₹27,000, the second represents:", o:["₹18,000", "₹20,000", "₹15,000", "₹24,000"], c:0, lv:3 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"A line rises from 100 to 150 over 5 periods, then falls to 120 over next 3. Net change from start:", o:["20% up", "30% up", "50% up", "20% down"], c:0, lv:3 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"A quantity increases by 10%, then 20%, then decreases 25%. Net percent change:", o:["-1%", "+5%", "-5%", "+1%"], c:0, lv:3 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"If a value drops 36% over two equal annual declines, each year's decline was:", o:["20%", "18%", "16%", "22%"], c:0, lv:3 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"A population of 8000 grows to 9261 in 3 years at constant rate. The annual rate is:", o:["5%", "7%", "6%", "4%"], c:0, lv:3 },
{ d:"E", u:"Growth Rates", t:"Growth", q:"Sales double every 3 years. The approximate annual growth rate is:", o:["26%", "33%", "20%", "50%"], c:0, lv:3 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"Products P,Q,R have margins 20%,30%,25% on sales ₹500,₹400,₹600. Which contributes the most profit?", o:["R", "Q", "P", "Equal"], c:0, lv:3 },
{ d:"E", u:"Multi-variable Data", t:"Multi-var", q:"In a table, 4 salespeople sell 40/55/30/75 units at ₹200 each with 5% commission. Highest earner's commission:", o:["₹750", "₹550", "₹400", "₹300"], c:0, lv:3 },
{ d:"E", u:"Tables", t:"Tables", q:"A dataset of 5 values has mean 20. Four are 15,18,22,25. The fifth is:", o:["20", "18", "22", "24"], c:0, lv:3 },
{ d:"E", u:"Bar Charts", t:"Bar Charts", q:"Stacked bar: 2022 total=₹200L (Product A ₹120L, B ₹80L). If A grows 25% and B 50%, new total:", o:["₹270L", "₹250L", "₹280L", "₹260L"], c:0, lv:3 },
{ d:"E", u:"Line Graphs", t:"Line Graph", q:"Speed rises linearly from 0 to 60 km/h in 10 s. Distance covered (approx):", o:["83 m", "100 m", "60 m", "120 m"], c:0, lv:3 },
{ d:"E", u:"Percentage Change", t:"% Change", q:"Profit margin rose from 15% to 18%. The percentage-point rise vs percent rise are:", o:["3 points, 20%", "3%, 3%", "20%, 3 points", "18%, 3%"], c:0, lv:3 },

/* ── Expansion v2: Domain F ─────────────────────────────────── */
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"C, F, I, L, ?", o:["O", "N", "M", "P"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"2A, 4B, 8C, 16D, ?", o:["32E", "24E", "32F", "16E"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"BD, FH, JL, ?", o:["NP", "MO", "NO", "MP"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"Z, W, T, Q, ?", o:["N", "O", "M", "P"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"In a row of 40, a boy is 12th from left. His rank from right:", o:["29th", "28th", "30th", "27th"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"Five friends sit in a row. If P is at one end and Q next to P, and R is in the middle, how many arrangements keep this?", o:["Several possible", "Only one", "None", "Exactly two"], c:0, lv:2 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: Rose, Lily, Mango, Jasmine", o:["Mango", "Rose", "Lily", "Jasmine"], c:0, lv:2 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: 3, 5, 7, 9, 11, 13", o:["9", "5", "7", "11"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"If all cats are animals, and some animals are wild, then:", o:["Some cats may be wild", "All cats are wild", "No cat is wild", "All animals are cats"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"If P implies Q, and Q is false, then:", o:["P is false", "P is true", "P may be true", "Cannot say"], c:0, lv:2 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"All doctors are graduates. No graduate is illiterate. Therefore:", o:["No doctor is illiterate", "Some doctors are illiterate", "All graduates are doctors", "Cannot conclude"], c:0, lv:2 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"A is taller than B, C is shorter than B, D is taller than A. Tallest is:", o:["D", "A", "B", "C"], c:0, lv:2 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"If MONDAY is coded as NPOEBZ (each letter +1), then FRIDAY is:", o:["GSJEBZ", "GSKEBZ", "GSJFBZ", "GSJEAZ"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"1, 4, 9, 16, 25, ? (positions of letters skip pattern)", o:["36", "30", "49", "35"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"6 people in a circle. Opposite to position 2 is:", o:["Position 5", "Position 4", "Position 6", "Position 3"], c:0, lv:2 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: Square, Circle, Triangle, Cube", o:["Cube", "Circle", "Square", "Triangle"], c:0, lv:2 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"No student who studies fails. Ravi failed. Therefore Ravi:", o:["Did not study", "Studied hard", "Is a topper", "Cannot conclude"], c:0, lv:2 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"Some pens are pencils. All pencils are erasers. Which must be true?", o:["Some pens are erasers", "All pens are erasers", "No pen is an eraser", "All erasers are pens"], c:0, lv:2 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"Ram ranks 7th from top and 26th from bottom in a class. Total students:", o:["32", "33", "31", "34"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"AZ, CX, EV, ?", o:["GT", "GU", "HT", "GS"], c:0, lv:2 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"In a queue, A is ahead of B but behind C. D is ahead of C. Who is first?", o:["D", "C", "A", "B"], c:0, lv:2 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: 2, 3, 6, 7, 8, 14", o:["7", "3", "6", "8"], c:0, lv:2 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"J, F, M, A, M, J, J, ? (month initials)", o:["A", "J", "S", "O"], c:0, lv:3 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"A, C, F, J, O, ?", o:["U", "T", "V", "S"], c:0, lv:3 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"8 people sit around a circular table. If A faces E, then A and E are separated by:", o:["3 people on each side", "2 people", "4 people", "1 person"], c:0, lv:3 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"In a class, Anu is 10th from top. Below her are twice as many as above. Class size:", o:["28", "27", "30", "25"], c:0, lv:3 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: 8, 27, 64, 125, 216, 343, 512, 1000, 1729", o:["1729", "512", "343", "1000"], c:0, lv:3 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"Either it rains or the match is played. The match was not played. Therefore:", o:["It rained", "It did not rain", "The match was cancelled", "Cannot conclude"], c:0, lv:3 },
{ d:"F", u:"Conditional Reasoning", t:"Conditional", q:"All A are B. No B is C. Some C are D. Which is definitely true?", o:["No A is C", "All D are C", "Some A are D", "No A is D"], c:0, lv:3 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"If 'all roses are flowers' and 'some flowers fade quickly', the valid conclusion is:", o:["Some roses may fade quickly", "All roses fade quickly", "No rose fades quickly", "All flowers are roses"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"A cube painted on all faces is cut into 27 small cubes. How many have exactly two painted faces?", o:["12", "8", "6", "24"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"A clock shows 4:20. The angle between the hour and minute hands is:", o:["10°", "20°", "0°", "15°"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"If in a code TABLE = 20+1+2+12+5 = 40, then CHAIR equals:", o:["44", "43", "45", "42"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"5 teams play each other once. Total matches played:", o:["10", "15", "20", "8"], c:0, lv:3 },
{ d:"F", u:"Arrangement", t:"Arrangement", q:"In a row, C is 5th from left, D is 6th from right. If they swap and now C is 12th from left, total people:", o:["17", "16", "18", "15"], c:0, lv:3 },
{ d:"F", u:"Logical Sequences", t:"Sequences", q:"3, 6, 11, 18, 27, ? (add consecutive odd? diffs 3,5,7,9)", o:["38", "36", "40", "34"], c:0, lv:3 },
{ d:"F", u:"Classification", t:"Classification", q:"Odd one out: 121, 144, 169, 196, 220, 256", o:["220", "196", "169", "256"], c:0, lv:3 },
{ d:"F", u:"Deductive Reasoning", t:"Deductive", q:"No honest person cheats. Some employees cheat. Therefore:", o:["Some employees are not honest", "All employees are honest", "No employee is honest", "All cheaters are employees"], c:0, lv:3 },
{ d:"F", u:"Analytical Puzzles", t:"Puzzles", q:"A frog in a 30 m well climbs 3 m by day, slips 2 m by night. Days to escape:", o:["28", "30", "27", "29"], c:0, lv:3 },

/* ── Expansion v2: Domain G ─────────────────────────────────── */
{ d:"G", u:"Workplace Problems", t:"Applied", q:"An employee earns ₹500/day and works 24 days. Monthly gross pay:", o:["₹12,000", "₹10,000", "₹14,000", "₹11,000"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A factory makes 480 units in 8 hours. Units per hour:", o:["60", "50", "70", "55"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A project of 900 person-hours with 5 people at 9 hours/day takes:", o:["20 days", "18 days", "25 days", "22 days"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"Attrition fell headcount from 400 to 360 in a year. Attrition rate:", o:["10%", "12%", "8%", "15%"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"GST at 18% on a base of ₹5,000. Total payable:", o:["₹5,900", "₹5,800", "₹6,000", "₹5,500"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A ₹40,000 salary has 10% PF and 5% tax deducted. Take-home:", o:["₹34,000", "₹35,000", "₹33,000", "₹36,000"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A ₹1L loan at 12% SI for 3 years. Total repayable:", o:["₹1,36,000", "₹1,30,000", "₹1,40,000", "₹1,32,000"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Data: 5,8,12,8,15,8. The mode is:", o:["8", "12", "5", "15"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Data: 10,20,30,40,50. The median is:", o:["30", "25", "35", "20"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Range of 45,12,78,33,60:", o:["66", "78", "45", "60"], c:0, lv:2 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Plan A: ₹200 flat. Plan B: ₹50 + ₹3/unit. At 40 units, cheaper plan:", o:["Plan A", "Plan B", "Equal", "Cannot say"], c:0, lv:2 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Product sells ₹400, variable cost ₹250, fixed cost ₹30,000. Break-even units:", o:["200", "150", "250", "180"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A team of 6 finishes in 10 days. To finish in 5 days, workers needed:", o:["12", "10", "15", "8"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"Simple interest earned on ₹20,000 at 8% for 6 months:", o:["₹800", "₹1,600", "₹1,000", "₹1,200"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Mean of 12,15,18,21,24:", o:["18", "16", "20", "19"], c:0, lv:2 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Buying in bulk saves ₹2/unit but adds ₹500 storage. Break-even quantity:", o:["250", "200", "300", "150"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"Overtime pays 1.5× the ₹200/hr rate. Pay for 4 overtime hours:", o:["₹1,200", "₹800", "₹1,000", "₹1,400"], c:0, lv:2 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"An item costs ₹1,500 with 20% down payment. Down payment is:", o:["₹300", "₹250", "₹350", "₹400"], c:0, lv:2 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"If mean of 5 numbers is 20 and four are 18,22,15,25, the fifth is:", o:["20", "18", "22", "24"], c:0, lv:2 },
{ d:"G", u:"Decision Making", t:"Decision", q:"A subscription is ₹1200/year or ₹120/month. Annual saving by yearly plan:", o:["₹240", "₹120", "₹200", "₹300"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A worker completes 5% of a job daily. Days to finish:", o:["20", "15", "25", "18"], c:0, lv:2 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A and B together finish in 12 days. A alone in 20 days. B alone takes:", o:["30 days", "25 days", "35 days", "28 days"], c:0, lv:3 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"12 workers finish in 18 days. After 6 days, 6 more join. Remaining days:", o:["8", "9", "10", "6"], c:0, lv:3 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A does 3/5 of a job in 9 days. Days to finish the rest at same rate:", o:["6", "5", "7", "4"], c:0, lv:3 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"₹50,000 at 8% CI compounded half-yearly for 1 year gives interest:", o:["₹4,080", "₹4,000", "₹4,160", "₹4,200"], c:0, lv:3 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"An investment returns 15% while inflation is 6%. Approx real return:", o:["9%", "21%", "8.5%", "6%"], c:0, lv:3 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A ₹2L loan needs equal payments over 2 years at 10% SI. Total interest is ₹40,000, so each of 24 monthly payments is:", o:["₹10,000", "₹9,000", "₹8,333", "₹11,000"], c:0, lv:3 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"A dataset has mean 60, median 45. The distribution is:", o:["Right-skewed", "Left-skewed", "Symmetric", "Uniform"], c:0, lv:3 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Adding a value equal to the mean to a dataset changes the mean by:", o:["Nothing", "It rises", "It falls", "Doubles"], c:0, lv:3 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"If each value in a dataset is multiplied by 3, the standard deviation:", o:["Triples", "Stays same", "Increases by 3", "Is unchanged in ratio"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Machine A: ₹1L cost, ₹5/unit. Machine B: ₹1.6L cost, ₹3/unit. At what volume is B cheaper?", o:["Above 30,000 units", "Above 20,000", "Above 40,000", "Always"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Selling price ₹500, variable cost ₹300, fixed ₹1,00,000. Units for ₹50,000 profit:", o:["750", "500", "600", "1000"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"Option A yields ₹8,000 certain. Option B yields ₹20,000 with 40% chance. Expected value favors:", o:["A", "B", "Equal", "Cannot say"], c:0, lv:3 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"Pipe A fills in 6 hrs, B in 4 hrs, drain C empties in 12 hrs. All open, fill time:", o:["3 hours", "4 hours", "2.4 hours", "3.5 hours"], c:0, lv:3 },
{ d:"G", u:"Financial Literacy", t:"Finance", q:"A sum at CI amounts to ₹4,840 in 2 years and ₹5,324 in 3 years. The rate is:", o:["10%", "12%", "8%", "9%"], c:0, lv:3 },
{ d:"G", u:"Statistical Interpretation", t:"Statistics", q:"Scores 40,50,60,70,80. The variance is:", o:["200", "150", "250", "100"], c:0, lv:3 },
{ d:"G", u:"Workplace Problems", t:"Applied", q:"A can do a job in x days, B in x+5 days. Together in 6 days. x =", o:["10", "12", "8", "15"], c:0, lv:3 },
{ d:"G", u:"Decision Making", t:"Decision", q:"A car costs ₹8L, depreciates 15%/year. Its value after 2 years is:", o:["₹5.78L", "₹6L", "₹5.44L", "₹6.2L"], c:0, lv:3 },

/* ── Expansion v2: Domain H ─────────────────────────────────── */
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A train 240 m long crosses a pole in 12 s. Its speed in km/h:", o:["72", "60", "80", "66"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Pipe A fills a tank in 15 min, B in 10 min. Together they take:", o:["6 min", "5 min", "8 min", "7 min"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A boat goes 20 km downstream in 2 hrs. If stream speed is 3 km/h, boat speed in still water:", o:["7 km/h", "10 km/h", "8 km/h", "6 km/h"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A mixture of 60 L has milk:water = 2:1. Water to add for 1:1 ratio:", o:["20 L", "15 L", "10 L", "25 L"], c:0, lv:2 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Cost C = 2000 + 15q. Cost of 200 units:", o:["₹5,000", "₹4,000", "₹6,000", "₹5,500"], c:0, lv:2 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Revenue R = 50q. Profit if cost is C = 2000 + 30q at q = 200:", o:["₹2,000", "₹1,000", "₹3,000", "₹4,000"], c:0, lv:2 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A survey reports 120% of respondents agreed. This means:", o:["An error occurred", "Strong agreement", "Overwhelming support", "Nothing unusual"], c:0, lv:2 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A model predicts negative sales volume. This indicates:", o:["Model limits exceeded", "High demand", "A profit", "Correct output"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"The sum of three consecutive integers is 51. The middle one:", o:["17", "16", "18", "15"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"A number decreased by 30% becomes 84. Original:", o:["120", "110", "130", "100"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"Perimeter of a square equals area numerically. Its side is:", o:["4", "2", "8", "16"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Two cars start 300 km apart moving toward each other at 40 and 60 km/h. Time to meet:", o:["3 hours", "2.5 hours", "4 hours", "3.5 hours"], c:0, lv:2 },
{ d:"H", u:"Modelling", t:"Modelling", q:"A phone plan charges ₹99 + ₹2 per GB. Bill for 25 GB:", o:["₹149", "₹125", "₹199", "₹150"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"Two numbers differ by 6, product 216. The larger:", o:["18", "16", "20", "24"], c:0, lv:2 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"An average of 10 salaries is skewed by one CEO's pay. A better central measure is:", o:["Median", "Mean", "Mode of one", "Range"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A cistern fills in 8 hrs but a leak makes it 10 hrs. Leak empties full tank in:", o:["40 hours", "30 hours", "50 hours", "20 hours"], c:0, lv:2 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"If 25% of a number equals 40% of 50, the number is:", o:["80", "75", "90", "100"], c:0, lv:2 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"Two trains 120 m and 180 m run toward each other at 54 and 36 km/h. Time to cross:", o:["12 s", "10 s", "15 s", "8 s"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A can fill a tank in 12 min, B empties in 18 min. Both open on an empty tank, time to fill:", o:["36 min", "30 min", "24 min", "40 min"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A boat's downstream speed is 15 km/h and upstream 9 km/h. Time to go 36 km upstream and back:", o:["6.4 hours", "6 hours", "7 hours", "5.6 hours"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"40 L of a 3:2 milk:water mix. How much mixture to remove and replace with milk for 4:1?", o:["10 L", "8 L", "12 L", "15 L"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"A man covers d km at 40 km/h and returns at 60 km/h. His average speed is:", o:["48 km/h", "50 km/h", "45 km/h", "52 km/h"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Profit P = 100q - 0.5q² - 2000. Maximum profit occurs at q =", o:["100", "50", "150", "200"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Demand q = 500 - 2p. Revenue is maximised at price p =", o:["125", "100", "150", "250"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"A population N = 2000×(1.5)ᵗ. It first exceeds 10,000 when t is between:", o:["3 and 4", "2 and 3", "4 and 5", "1 and 2"], c:0, lv:3 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A study links coffee to longer life but ignores that coffee drinkers exercise more. The flaw is:", o:["Confounding variable", "Small sample", "Calculation error", "No flaw"], c:0, lv:3 },
{ d:"H", u:"Evaluation", t:"Evaluation", q:"A forecast has 95% confidence yet fails. The most reasonable conclusion:", o:["Rare events still occur", "The maths was wrong", "Confidence means certainty", "Forecasts are useless"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"The product of two consecutive odd numbers is 195. The larger:", o:["15", "13", "17", "19"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"A sum of money doubles in 5 years at SI. In how many years does it triple?", o:["10", "15", "12", "8"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"If the radius of a circle increases 20%, its area increases by:", o:["44%", "40%", "20%", "21%"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"Three numbers in ratio 3:4:5 have sum of squares 200. The largest:", o:["10", "8", "12", "15"], c:0, lv:3 },
{ d:"H", u:"Complex Multi-step", t:"Problem Solving", q:"5 men or 8 women finish a job in 12 days. Time for 3 men and 4 women together:", o:["120/17 days", "10 days", "8 days", "12 days"], c:0, lv:3 },
{ d:"H", u:"Modelling", t:"Modelling", q:"Total cost TC = 500 + 20q + 0.1q². Average cost per unit at q = 50 is:", o:["₹35", "₹30", "₹40", "₹45"], c:0, lv:3 },
{ d:"H", u:"Mathematical Reasoning", t:"Reasoning", q:"A cube's surface area is 150 cm². Its volume is:", o:["125 cm³", "100 cm³", "150 cm³", "216 cm³"], c:0, lv:3 },
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
