const xray = require("aws-xray-sdk")
const aws = AWSXRay.captureAWS(require("aws-sdk"));
const ses = new aws.SES({ region: "eu-west-2" });
require("dotenv").config();

exports.handler = async (event) => {
  const { name, email, message } = JSON.parse(event.body);

  const params = {
    Destination: {
      ToAddresses: [process.env.CONTACT_EMAIL_TO],
    },
    Message: {
      Body: {
        Text: { Data: `Message from ${name} (${email}): ${message}` },
      },
      Subject: { Data: "Portfolio Contact Form" },
    },
    Source: process.env.CONTACT_EMAIL_FROM,
  };

  try {
    await ses.sendEmail(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send email" }),
    };
  }
};
