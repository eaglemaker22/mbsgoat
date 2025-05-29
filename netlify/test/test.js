const { v4 } = require('uuid');

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: `Hello from test function! UUID: ${v4()}`,
  };
};