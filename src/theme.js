// Design tokens. Values must stay 6-digit hex: components append 2-digit alpha (e.g. T.accent+"22").
// Monochrome, Trade-Republic-like: content sits directly on the background; colour only carries meaning.
export const DARK = {
  bg:"#000000", surface:"#000000", surfaceHigh:"#141414", field:"#1c1c1e", sheet:"#0f0f10",
  border:"#1f1f21", borderHigh:"#2c2c2e",
  text:"#ffffff", textMid:"#a1a1a6", textLow:"#8e8e93", textDim:"#6c6c70",
  accent:"#ffffff", onAccent:"#000000",
  green:"#2fce75", red:"#ff5b52", amber:"#f5a623", purple:"#a594ff", pink:"#ff82b4",
  tabBar:"#000000", tabBorder:"#1f1f21", header:"#000000",
  shadow:"none",
};
export const LIGHT = {
  bg:"#ffffff", surface:"#ffffff", surfaceHigh:"#f4f4f5", field:"#f2f2f4", sheet:"#ffffff",
  border:"#ececee", borderHigh:"#dcdce0",
  text:"#0a0a0a", textMid:"#636366", textLow:"#6e6e73", textDim:"#a1a1a6",
  accent:"#0a0a0a", onAccent:"#ffffff",
  green:"#0d9c55", red:"#e0342b", amber:"#c27a0a", purple:"#6b52e0", pink:"#c0407e",
  tabBar:"#ffffff", tabBorder:"#ececee", header:"#ffffff",
  shadow:"none",
};
