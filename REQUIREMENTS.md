Our product is a browser extension that enhances security for web-based GenAI applications, with a key feature of having the ability to block access to GenAI applications based on administrator configurations.

Your Assignment
Develop an automation tool to confirm the extension correctly allows/blocks the specified GenAI applications. In this case our policy is to:
Allow chatgpt.com
Block others like gemini.google.com
Include both positive and negative test scenarios in your automation to ensure thorough functionality testing.
The automation tool should run as part of a CI pipeline in addition to locally on the desktop. You can assume the extension is available as a static file locally.
Submit guidelines
Run the automation as part of a Github Action pipeline.
The pipeline’s output should be the printout of the test suite.
Send a link to the Github repository

Extension Installation Guide
To facilitate your development and testing process, we encourage you to install and use our browser extension.
This will allow you to interact directly with the product and gain hands-on experience with its functionality. Below are the steps to install and configure the extension:
1. Install our browser extension from chrome web store -
https://chromewebstore.google.com/detail/prompt-security-browser-e/iidnankcocecmgpcafggbgbmkbcldmno?pli=1
2. Enter the API Domain and Key in the extension settings (by clicking on the extension icon) -
API Key: cc6a6cfc-9570-4e5a-b6ea-92d2adac90e4
API domain: eu.prompt.security

Please note: Once installed and configured, the extension will monitor your usage of web-based GenAI applications as part of its core functionality. You may cancel or disable it anyime by removing the extension.
Submission Guidelines
To submit your completed assignment, please provide us with a Github repo containing all necessary files to run your automation tool.
This should include your source code, any dependencies or configuration files, and a clear set of instructions on how to execute your tests.
Provide a link to a successful pipeline showing the test results