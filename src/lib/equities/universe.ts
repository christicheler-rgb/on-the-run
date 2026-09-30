export type Sleeve =
  | "Money-center bank"
  | "Broker"
  | "Regional bank"
  | "Consumer finance"
  | "Homebuilder"
  | "Mortgage originator"
  | "Mortgage REIT"
  | "Equity REIT"
  | "Utility"
  | "Life insurer"
  | "Telecom"
  | "Long-duration growth";

export type DeskName = {
  ticker: string;
  name: string;
  sleeve: Sleeve;
};

/** Liquid names whose businesses actually reprice when Treasury yields move. Not the whole market. */
export const DESK: DeskName[] = [
  { ticker: "JPM", name: "JPMorgan Chase", sleeve: "Money-center bank" },
  { ticker: "BAC", name: "Bank of America", sleeve: "Money-center bank" },
  { ticker: "WFC", name: "Wells Fargo", sleeve: "Money-center bank" },
  { ticker: "C", name: "Citigroup", sleeve: "Money-center bank" },
  { ticker: "GS", name: "Goldman Sachs", sleeve: "Broker" },
  { ticker: "MS", name: "Morgan Stanley", sleeve: "Broker" },
  { ticker: "SCHW", name: "Charles Schwab", sleeve: "Broker" },
  { ticker: "USB", name: "U.S. Bancorp", sleeve: "Regional bank" },
  { ticker: "PNC", name: "PNC Financial", sleeve: "Regional bank" },
  { ticker: "TFC", name: "Truist", sleeve: "Regional bank" },
  { ticker: "FITB", name: "Fifth Third", sleeve: "Regional bank" },
  { ticker: "KEY", name: "KeyCorp", sleeve: "Regional bank" },
  { ticker: "RF", name: "Regions Financial", sleeve: "Regional bank" },
  { ticker: "COF", name: "Capital One", sleeve: "Consumer finance" },
  { ticker: "SYF", name: "Synchrony", sleeve: "Consumer finance" },
  { ticker: "ALLY", name: "Ally Financial", sleeve: "Consumer finance" },
  { ticker: "AXP", name: "American Express", sleeve: "Consumer finance" },
  { ticker: "DHI", name: "D.R. Horton", sleeve: "Homebuilder" },
  { ticker: "LEN", name: "Lennar", sleeve: "Homebuilder" },
  { ticker: "PHM", name: "PulteGroup", sleeve: "Homebuilder" },
  { ticker: "TOL", name: "Toll Brothers", sleeve: "Homebuilder" },
  { ticker: "RKT", name: "Rocket Companies", sleeve: "Mortgage originator" },
  { ticker: "NLY", name: "Annaly Capital", sleeve: "Mortgage REIT" },
  { ticker: "AGNC", name: "AGNC Investment", sleeve: "Mortgage REIT" },
  { ticker: "O", name: "Realty Income", sleeve: "Equity REIT" },
  { ticker: "PLD", name: "Prologis", sleeve: "Equity REIT" },
  { ticker: "AMT", name: "American Tower", sleeve: "Equity REIT" },
  { ticker: "SPG", name: "Simon Property", sleeve: "Equity REIT" },
  { ticker: "WELL", name: "Welltower", sleeve: "Equity REIT" },
  { ticker: "NEE", name: "NextEra Energy", sleeve: "Utility" },
  { ticker: "DUK", name: "Duke Energy", sleeve: "Utility" },
  { ticker: "SO", name: "Southern Company", sleeve: "Utility" },
  { ticker: "D", name: "Dominion Energy", sleeve: "Utility" },
  { ticker: "MET", name: "MetLife", sleeve: "Life insurer" },
  { ticker: "PRU", name: "Prudential", sleeve: "Life insurer" },
  { ticker: "AFL", name: "Aflac", sleeve: "Life insurer" },
  { ticker: "VZ", name: "Verizon", sleeve: "Telecom" },
  { ticker: "T", name: "AT&T", sleeve: "Telecom" },
  { ticker: "AAPL", name: "Apple", sleeve: "Long-duration growth" },
  { ticker: "MSFT", name: "Microsoft", sleeve: "Long-duration growth" },
  { ticker: "NVDA", name: "NVIDIA", sleeve: "Long-duration growth" },
  { ticker: "AMZN", name: "Amazon", sleeve: "Long-duration growth" },
  { ticker: "GOOGL", name: "Alphabet", sleeve: "Long-duration growth" },
  { ticker: "META", name: "Meta Platforms", sleeve: "Long-duration growth" },
];
