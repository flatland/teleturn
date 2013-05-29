var Table = function (selector, opts) {
  opts = opts || {};

  this.selector  = selector
  this.toCells   = opts.toCells || Table.defaultCells;
  this.change    = opts.change;
  this.invert    = opts.invert;
  this.class     = opts.class;
  this.items     = opts.items || [];
  this.itemCount = 0;
};

Table.deletable = function(toCells) {
  return function(item) {
    var self = this;
    var cells = toCells(item);
    var removeLink = $("<span/>", {id: "remove", html: "&times;"})
    removeLink.on("click", function() { self.remove(item.id) });
    cells.push({html: removeLink});
    return cells;
  };
};

Table.defaultCells = function (item) {
  return _.map(item, function(val) {
    return {text: val};
  })
};

Table.prototype.add = function(item) {
  item.id = this.itemCount++;
  this.items.push(item);
  this.change(this);
  this.update();

  return item.id;
};

Table.prototype.replace = function(items) {
  var self = this;
  this.items = items || [];
  _.each(this.items, function(item) {
    item.id = self.itemCount++;
  });
  this.change(this);
  this.update();
};

Table.prototype.remove = function(id) {
  this.items = _.reject(this.items, function(item) { return item.id == id });
  this.change(this);
  this.update();
};

Table.prototype.update = function() {
  var self = this;

  var cells = []
  _.each(this.items, function(item, i) {
    _.each(self.toCells(item), function(cell, j) {
      if (self.invert) {
        cells[j] = cells[j] || [];
        cells[j][i] = cell;
      } else {
        cells[i] = cells[i] || []
        cells[i][j] = cell;
      }
    });
  });

  var table = $("<table/>", {class: this.class});
  _.each(cells, function(row) {
    var tr = $("<tr/>")
    _.each(row, function(cell) { tr.append($("<td/>", cell)) });
    table.append(tr);
  });
  $(this.selector).html("").append(table);
};
