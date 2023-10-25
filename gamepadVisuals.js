// Create a table element
var table = document.createElement("table");

// Create rows and cells for the table
for (var i = 0; i < 3; i++) {
    var row = document.createElement("tr");
    for (var j = 0; j < 4; j++) {
        var cell = document.createElement("td");

        if (i === 0) {
            cell.textContent = "Axis " + j;
        } else if (i === 1) {
            var axisValueElement = document.createElement("td");
            axisValueElement.id = "axisValue" + (j);
            axisValueElement.textContent = "255";
            cell.appendChild(axisValueElement);
        } else {
            var slider = document.createElement("input");
            slider.id = "slider" + (j);
            slider.className = "slider";
            slider.type = "range";
            slider.min = "0";
            slider.max = "255";
            slider.value = "127";
            slider.width = "50px";
            cell.appendChild(slider);
        }
        row.appendChild(cell);
    }
    table.appendChild(row);
}
const tableContainer = document.getElementById("tableContainer");
tableContainer.appendChild(table);


// Create 16 buttons and add them to the buttonsRow div
const buttonsContainer = document.getElementById('buttonsContainer');
for (let i = 0; i <= 7; i++) {
    const button = document.createElement('button');
    button.id = "button"+ (i + 1);
    button.textContent = i;
    button.className = 'button grey button-gamepad'; // Initially set to grey
    // button.onclick = function() {
    //     toggleColor(button); // Toggle color on click
    // };
    buttonsContainer.appendChild(button);
}