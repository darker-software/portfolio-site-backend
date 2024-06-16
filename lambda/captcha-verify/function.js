require("dotenv").config();
const axios = require("axios");
const { CaptchaHeaderKey } = require("../src/lib/constants");
const AWSXRay = require("aws-xray-sdk");
const AWS = AWSXRay.captureAWS(require("aws-sdk"));

exports.handler = async (event) => {
  const token = event.headers["x-captcha-token"];
  const captchaSecret = process.env.HCAPTCHA_SECRET;

  const verificationUrl = `https://hcaptcha.com/siteverify?secret=${captchaSecret}&response=${token}`;

  try {
    const response = await axios.post(verificationUrl);
    if (response.data.success) {
      return generatePolicy("user", "Allow", event.methodArn);
    } else {
      return generatePolicy("user", "Deny", event.methodArn);
    }
  } catch (error) {
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = "2012-10-17";
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = "execute-api:Invoke";
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};
