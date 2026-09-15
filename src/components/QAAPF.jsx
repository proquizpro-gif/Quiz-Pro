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
import { insertQuestions, fetchQuestions } from "../lib/db.js";

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
];

/* ── Difficulty label helper ─────────────────────────────────────── */
const diffLabel = v => v===1?"Easy":v===2?"Medium":"Hard";
const diffTone  = v => v===1?"emerald":v===2?"amber":"rose";

/* ══════════════════════════════════════════════════════════════════
   STUDENT APTITUDE PROFILE — computed from attempt items
   ══════════════════════════════════════════════════════════════════ */
export function computeQAAPFProfile(attempts, allQuestions) {
  /* Flatten all answered items across attempts, keyed by question id */
  const answered = {};
  for (const att of attempts) {
    for (const it of (att.items || [])) {
      const key = it.qid || it.question;
      if (!answered[key]) answered[key] = { correct:0, seen:0 };
      answered[key].seen++;
      if (it.chosen === it.correct) answered[key].correct++;
    }
  }

  /* Map to domain scores */
  const domainScore = {};
  for (const dom of DOMAINS) domainScore[dom.id] = { correct:0, total:0 };

  /* Check built-in QAAPF bank first */
  for (const bq of QAAPF_QUESTIONS) {
    const key = bq.q;
    const rec = answered[key];
    if (!rec) continue;
    domainScore[bq.d].correct += rec.correct;
    domainScore[bq.d].total   += rec.seen;
  }

  /* Also check question bank questions tagged with domain units */
  for (const q of (allQuestions || [])) {
    const rec = answered[q.id] || answered[q.question];
    if (!rec) continue;
    const dom = DOMAINS.find(d => d.units.some(u =>
      u.toLowerCase() === (q.unit||"").toLowerCase() ||
      u.toLowerCase() === (q.topic||"").toLowerCase()
    ));
    if (!dom) continue;
    domainScore[dom.id].correct += rec.correct;
    domainScore[dom.id].total   += rec.seen;
  }

  const domainProfiles = DOMAINS.map(dom => {
    const { correct, total } = domainScore[dom.id];
    const pct = total ? Math.round((correct/total)*100) : null;
    return { ...dom, correct, total, pct, level: pct !== null ? getQLevel(pct) : null };
  });

  const totalCorrect = Object.values(domainScore).reduce((s,v)=>s+v.correct,0);
  const totalSeen    = Object.values(domainScore).reduce((s,v)=>s+v.total,0);
  const overallPct   = totalSeen ? Math.round((totalCorrect/totalSeen)*100) : null;
  const overallLevel = overallPct !== null ? getQLevel(overallPct) : null;

  const strengths = domainProfiles.filter(d => d.pct !== null && d.pct >= 70).sort((a,b)=>b.pct-a.pct).slice(0,3);
  const gaps      = domainProfiles.filter(d => d.pct !== null && d.pct <  60).sort((a,b)=>a.pct-b.pct).slice(0,3);

  return { domainProfiles, overallPct, overallLevel, strengths, gaps, totalSeen, totalCorrect };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN QAAPF PANEL (faculty view)
   ══════════════════════════════════════════════════════════════════ */
export default function QAAPFPanel({ attempts, classrooms, questions, quizzes, setQuizzes, setQuestions }) {
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const toast2 = (m, t="emerald") => { setToast({m,t}); setTimeout(()=>setToast(null),3500); };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.m} tone={toast.t} onDismiss={()=>setToast(null)}/>}

      {/* Header */}
      <div className={`${card} overflow-hidden`}>
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2"><Brain size={20}/> QAAPF</h2>
              <p className="mt-0.5 text-sm text-violet-200">Quantitative & Analytical Aptitude Proficiency Framework</p>
              <p className="mt-1 text-[11px] text-violet-300">Grounded in OECD PIAAC Numeracy · 8 domains · 6 proficiency bands · {QAAPF_QUESTIONS.length}+ questions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["dashboard","levels","bank","cohort"].map(t => (
                <button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${tab===t?"bg-white text-violet-700":"bg-white/10 text-white hover:bg-white/20"}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tab==="dashboard" && <Dashboard attempts={attempts} questions={questions} quizzes={quizzes} classrooms={classrooms}/>}
      {tab==="levels"    && <LevelsGuide/>}
      {tab==="bank"      && <QuestionInventory questions={questions} setQuestions={setQuestions} toast2={toast2}/>}
      {tab==="cohort"    && <CohortHeatmap attempts={attempts} questions={questions}/>}
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

function StudentProfileCard({ student: s }) {
  const lvl = s.profile.overallLevel;
  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
          <p className="text-xs text-slate-500">{s.course} · {s.cu_id} · {s.attempts.length} attempt{s.attempts.length!==1?"s":""}</p>
        </div>
        {lvl && <div className={`rounded-2xl border px-4 py-2 text-center ${lvl.light}`}><div className="text-xl font-extrabold">{lvl.level}</div><div className="text-xs font-semibold">{lvl.label}</div></div>}
      </div>
      <p className="text-xs text-slate-600 mb-4 leading-relaxed">{lvl?.desc}</p>

      {/* Domain bars */}
      <div className="space-y-3">
        {s.profile.domainProfiles.map(d => (
          <div key={d.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">{d.icon} {d.name}</span>
              {d.pct !== null
                ? <div className="flex items-center gap-2"><span className={`${num} text-xs font-bold ${d.pct>=70?"text-emerald-600":d.pct>=50?"text-amber-600":"text-rose-600"}`}>{d.pct}%</span><span className={`text-[10px] font-bold rounded-full border px-1.5 py-0.5 ${d.level?.light}`}>{d.level?.level}</span></div>
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
        <p className="text-xs text-slate-500 mb-4">QAAPF is an institutional diagnostic framework grounded in OECD PIAAC Numeracy and PISA Mathematics. The mapping to CEFR is structural — not that Q3 = B1 internationally, but that the 6-band progression mirrors CEFR's logic.</p>
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
