const getHomePage = (req, res) => {
  res.render("index/homepage");
};

const getLoginPage = (req, res) => {
  res.render("index/login");
};

const getRegisterPage = (req, res) => {
  res.render("index/register");
};

module.exports = { getHomePage, getLoginPage, getRegisterPage };
