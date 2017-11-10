function create(__helpers) {
  var str = __helpers.s,
      empty = __helpers.e,
      notEmpty = __helpers.ne,
      escapeXml = __helpers.x;

  return function render(data, out) {
    out.w("<html><body><div><h1>" +
      escapeXml(title) +
      "</h1><div>" +
      escapeXml(message) +
      "</div><p>@ hapi visionaries " +
      escapeXml(year) +
      "</p> Yo loL</div></body></html>");
  };
}

(module.exports = require("marko").c(__filename)).c(create);
