function makeData() {
    "use strict";

    var exponent = 3;
    var data = [];

    for (var i = 0; i < 10; i++) {
        var x = Math.pow(3, i)/100;
        data.push({x: x, y: Math.pow(x, exponent)});
    }

    return data;
}

function run(div, data, Plottable) {
    "use strict";

    var xScale = new Plottable.Scales.Log();
    var yScale = new Plottable.Scales.Log();
    var xAxis = new Plottable.Axes.Numeric(xScale, "bottom")
        .formatter(Plottable.Formatters.exponential());
    var yAxis = new Plottable.Axes.Numeric(yScale, "left")
        .formatter(Plottable.Formatters.exponential());

    var plot1 = new Plottable.Plots.Scatter()
        .renderer("svg")
        .deferredRendering(true)
        .addDataset(new Plottable.Dataset(data))
        .labelsEnabled(true)
        .x((d) => d.x, xScale)
        .y((d) => d.y, yScale);

    var plot2 = new Plottable.Plots.Scatter()
        .renderer("svg")
        .deferredRendering(true)
        .addDataset(new Plottable.Dataset(data))
        .labelsEnabled(true)
        .x((d) => 10000*d.x, xScale)
        .y((d) => 1000*d.y, yScale);

    var plotGroup = new Plottable.Components.Group([plot1, plot2]);

    var table = new Plottable.Components.Table([
        [yAxis, plotGroup],
        [null, xAxis]
    ]);

    var panZoom = new Plottable.Interactions.PanZoom(xScale, yScale).attachTo(plotGroup);

    table.renderTo(div);

    panZoom.setMinMaxDomainValuesTo(xScale);
    panZoom.setMinMaxDomainValuesTo(yScale);
}
