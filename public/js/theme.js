document.addEventListener("DOMContentLoaded", function () {
  var ts = document.getElementById("themeSelect");
  if (ts) {
    ts.onchange = function () {
      document.documentElement.setAttribute("data-theme", this.value);
    };
  }
});
