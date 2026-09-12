import { Component, createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error("App crashed:", e, info); }
  render() {
    const { error } = this.state;
    if (error) {
      return createElement("div", {
        style: { display:"grid", minHeight:"100vh", placeItems:"center", fontFamily:"Inter,sans-serif", background:"#f8fafc", padding:24 }
      }, createElement("div", {
        style: { maxWidth:520, background:"white", borderRadius:16, border:"1px solid #fecaca", padding:32 }
      },
        createElement("div", { style:{ fontSize:28, marginBottom:12 } }, "❌"),
        createElement("h2", { style:{ margin:"0 0 8px", color:"#dc2626", fontSize:18 } }, "App error — screenshot this:"),
        createElement("pre", { style:{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:12, fontSize:11, color:"#991b1b", overflow:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" } },
          error.message + "\n\n" + (error.stack||"").split("\n").slice(0,6).join("\n")
        ),
        createElement("p", { style:{ fontSize:12, color:"#64748b", margin:"12px 0 0" } }, "Send this screenshot to Claude.")
      ));
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  createElement(ErrorBoundary, null, createElement(App, null))
);
