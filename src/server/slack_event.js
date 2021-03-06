const send = require('@polka/send-type');

const runtime = require('../runtime.js');
const roulette = require(`./commands/roulette.js`);

exports.parse_slack_event = async (req, res) => {
  const { type: request_type } = req.body;

  if (request_type === 'url_verification') {
    const { challenge } = req.body;
    return send(res, 200, challenge);
  }

  if (request_type === 'event_callback') {
    const {
      // authed_users: [bot_id],
      event,
    } = req.body;

    if (event.type === 'app_mention') {
      const { ts, thread_ts, channel: channel_id, user: user_id, text } = event;
      const channel = runtime.get_channel(channel_id);

      if (!channel || !thread_ts) return;

      const match = text.match(/(?:roulette|random)(?: +(.*)$)?/);
      if (match) {
        roulette({
          channel,
          ts,
          thread_ts,
          user_id,
          params: match && match[1],
        });
      }
    }
  }
  send(res, 200);
};
