/* Node scripts and tests: install the built-in bank from source, as a
   staff browser does after unsealing it. */
import { installBank } from "../src/lib/qaapf-core.js";
import { QAAPF_QUESTIONS, QAAPF_LEGACY, QAAPF_BANK_VERSION, QAAPF_BANK_DATE } from "../src/lib/qaapf-bank.js";
installBank({ questions: QAAPF_QUESTIONS, legacy: QAAPF_LEGACY, version: QAAPF_BANK_VERSION, date: QAAPF_BANK_DATE });
