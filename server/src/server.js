const { PORT } = require("./config/env");

const app = require("./app");

const activePort = PORT || 3001;

app.listen(activePort, () => {
  console.log(`FlowForge API running at http://localhost:${activePort}`);
});
