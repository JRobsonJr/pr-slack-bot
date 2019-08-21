const db = require('../api/db.js');
const runtime = require('../runtime.js');

function on_installation({ req }) {
  const {
    installation,
    repositories_removed: removed,
    repositories_added: added,
  } = req.body;

  if (removed) {
    removed.forEach(repo => db.installations.unset_id(repo.full_name));
  }

  if (added) {
    added.forEach(repo =>
      db.installations.set_id(repo.full_name, installation.id),
    );
  }
  return;
}

async function on_pull_request_change({ event, req }) {
  const { action, repository } = req.body;
  let pull_request = req.body.pull_request;
  if (event === 'check_suite') {
    pull_request = req.body.check_suite.pull_requests[0];
  }

  if (!pull_request) {
    throw `Couldn't find a Pull Request for "${event}/${action}"`;
  }

  const pr_slug = `${repository.full_name}/${pull_request.number}`;
  console.log(`\nTriggered "${event}/${action}" on "${pr_slug}"`);

  const pr = runtime.prs.all.find(pr => pr.slug === pr_slug);
  if (pr == null) return;

  const channel = runtime.get_channel(pr.channel);
  return pr.update_on_hook({ event, ...req.body }).then(channel.on_pr_updated);
}

exports.parse_github_webhook = async (req, res) => {
  const event = req.headers['x-github-event'];

  res.statusCode = 200;
  res.end('ok');

  if (event === 'installation_repositories') {
    return on_installation({ event, req, res });
  }

  if (
    event === 'pull_request' ||
    event === 'pull_request_review' ||
    event === 'pull_request_review_comment' ||
    event === 'check_suite'
  ) {
    return on_pull_request_change({ event, req, res });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\nIgnoring event: "${event}/${req.body.action}"`);
  }
};