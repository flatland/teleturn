var telegraph;
var targets = new Table("#targets", targetCells, function(targets) {
  telegraph.targets = targets.items;
  redraw();
});
_.bindAll(targets)

load();
$(window).on("hashchange", function () { load() });

function targetCells(target) {
  var sub = $("#variables").is(":focus") ? _.identity : telegraph.subVariables;

  var query = sub(target.query);
  var shift = sub(target.shift);

  var labelField = $("<span/>", {text: target.label, contenteditable: true})
  blurOnEnter(labelField);
  labelField.blur(function(e) {
    var newLabel = $(this).text();
    if (newLabel != target.label) {
      target.label = newLabel;
      redraw();
    }
  });

  var cells = [
    {html: labelField},
    {class: "monospace", html: $("<a/>", {text: query}).click(_.partial(fillQuery, target))},
    {class: "monospace", text: shift}
  ]
  var chart = $("#chart").val();

  if (chart == "multiChart") {
    cells.push({text: target.type});
    cells.push({html: (target.yAxis == 1 ? "&larr;" : "&rarr;")});
  } else if (chart == "linePlusBarChart") {
    cells.push({text: target.bar || "line"});
  }
  return cells;
};

function displayHeader() {
  $("#name").text(telegraph.name);
  $("#graph-header").css({display: telegraph.name ? "block" : "none"});
};

function markChanged(changed) {
  var revert = $("#revert").parent();
  if (changed) {
    revert.removeClass("disabled");
  } else {
    revert.addClass("disabled");
  }

  $("#save").attr("disabled", !changed);
}

function redraw(name) {
  telegraph.draw("#graph", displayHeader);
  telegraph.hasVariables() ? $("#variables").show() : $("#variables").hide();

  // Use draw count as a proxy for changes since we only redraw when a change is made.
  markChanged(telegraph.draws > 1);

  var chart = $("#chart").val();
  display(".multi", chart == "multiChart");
  display(".line-plus-bar", chart == "linePlusBarChart");
};

function fillQuery(target) {
  $("#query").val(target.query);
  $("#baseUrl").val(target.baseUrl);
  $("#shift").val(target.shift);
  $("#bar").val(target.bar);
  $("#type").val(target.type);
  $("#yAxis").val(target.yAxis);
};

function display(selector, show) {
  $(selector).css({display: show ? "inline-block" : "none"})
};

function save(force) {
  telegraph.save({
    force: force,
    success: function(results) {
      showAlert(results.name + " saved", "success");
      pushHistory(telegraph.name);
      markChanged(false);
      displayHeader();
    },
    error: function(error) {
      if (confirm(error + " Would you like to overwrite?")) {
        save(true);
      }
    }
  });
};

function pushHistory(name) {
  history.pushState(name, "", window.location.pathname + (name ? "#" + name : ""));
};

function showAlert(text, type) {
  if (type) type = "alert-" + type;
  $("#alerts").append($("<div/>", {class: "alert fade in " + type, text: text}));
  setTimeout(function() { $(".alert").alert('close'); }, 2000);
};

function hash() {
  return window.location.hash.substr(1)
};

function load(name) {
  Telegraph.load({
    name: name == null ? hash() : name,
    success: function(t) {;
                          telegraph = t;
                          _.bindAll(telegraph);

                          if (name != null) pushHistory(telegraph.name);
                          $("#from").val(telegraph.from);
                          $("#until").val(telegraph.until);
                          $("#chart").val(telegraph.chart);
                          $("#variables").val(JSON.stringify(telegraph.variables));

                          targets.replace(telegraph.targets);
                         },
    error: function(name) {
      showAlert("no such graph: " + name);
      if (!telegraph) load("");
    }
  });
};

function blurOnEnter(selector) {
  $(selector).keydown(function(e) {
    if(e.keyCode == 13) $(this).blur();
  });
};

function selectAll() {
  document.execCommand("selectAll",false,null);
};

$(document).ready(function() {
  $("#add").click(function() {
    var query = $("#query").val();
    var shift = $("#shift").val();
    targets.add({
      label:    _.compact([shift, query]).join(":"),
      query:    query,
      shift:    shift,
      baseUrl:  $("#baseUrl").val(),
      bar:      $("#bar").val(),
      type:     $("#type").val(),
      yAxis:    $("#yAxis").val()
    });
  });

  $("#refresh").click(function() {
    telegraph.update();
  });

  $("#from").change(function() {
    telegraph.from = $(this).val();
    redraw();
  });

  $("#until").change(function() {
    telegraph.until = $(this).val();
    redraw();
  });

  $("#chart").change(function() {
    telegraph.chart = $(this).val();
    redraw();
  });

  $("#variables").change(function() {
    var variables = $("#variables").val();
    telegraph.variables = variables ? JSON.parse(variables) : null
    redraw();
    targets.update();
  });

  $("#variables").focus(function() {
    $(this).css({height: "78px"});
    targets.update();
  });

  $("#variables").blur(function() {
    $(this).css({height: "21px"});
    targets.update();
  });

  var renaming;
  $("#name").blur(function() {
    var self = this;
    var name = $(this).text();
    if (renaming) {  // rename
      telegraph.rename({
        name: name,
        success: function(from) {
          showAlert("Renamed " + from + " to " + name, "success");
          pushHistory(telegraph.name);
        },
        error: function(error) {
          showAlert(error);
          $(self).text(telegraph.name);
        }
      });
      renaming = false;
    } else {  // duplicate
      telegraph.name = name;
      pushHistory(telegraph.name);
      telegraph.hash = null;
    }
    $(this).attr({contenteditable: false});
  });

  blurOnEnter("#name");

  $("#save").click(function() {
    telegraph.name = telegraph.name || prompt("Save graph as:");
    save();
  });

  $("#rename").click(function() {
    renaming = true;
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).focus();
    selectAll();
    return false;
  });

  $("#duplicate").click(function() {
    $("#graph-menu").dropdown("toggle");
    $("#name").attr({contenteditable: true}).text(telegraph.name + " copy").focus();
    markChanged(true);
    document.execCommand("selectAll",false,null);
    return false;
  });

  $("#revert").click(function() {
    $("#graph-menu").dropdown("toggle");
    load(telegraph.name);
    return false;
  });

  $("#close").click(function() {
    $("#graph-menu").dropdown("toggle");
    load("");
    return false;
  });

  $("#delete").click(function() {
    $("#graph-menu").dropdown("toggle");
    if (confirm("Graph " + telegraph.name + " will be permanently deleted. Are you sure?")) {
      telegraph.delete({
        success: function() {
          showAlert("Deleted graph " + telegraph.name, "success");
          load("");
        },
        error: function(error) {
          showAlert(error, "error");
        }
      });
    }
    return false;
  });

  var loadName = $("<input/>", {type: "text", id: "load-name", placeholder: "graph name"});
  $("#load").popover({
    html: true,
    content: loadName,
    trigger: "manual"
  });

  $("#load").click(function(e) {
    e.stopPropagation();

    if ($(this).next('div.popover:visible').length == 0) {
      $(this).popover("show");

      var options = [];
      $("#load-name").keydown(function(e) {
        if (e.keyCode == 13) {
          $(this).blur();
          var name = $(this).val();
          load(name);
        }
      }).click(function(e) {
        e.stopPropagation();
      }).blur(function() {
        $("#load").popover("toggle");
      }).typeahead({
        source: function(query) {
          return _.filter(options, function(name) { return name.indexOf(query) == 0 });
        }
      }).focus();

      // Load typeahead asynchronously.
      Telegraph.list(function(names) {
        options = names;
      });

      selectAll();
    } else {
      $(this).popover("hide");
    }
  });

  $("html").click(function() {
    $("#load").popover("hide");
  });

  var $select = $("#baseUrl");
  _.each(telegraphBaseUrls, function (base) {
    $select.append('<option value=' + base.url + '>' + base.label + '</option>');
  });
});