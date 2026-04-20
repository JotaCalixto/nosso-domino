module.exports = {
  apps: [{
    name: "nosso-domino",
    script: "node_modules/.bin/next",
    args: "start -p 3002 -H 0.0.0.0",
    cwd: "/root/nosso-domino",
    env: {
      NODE_ENV: "production",
    },
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
