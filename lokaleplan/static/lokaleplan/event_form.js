function get_locations(participant_id) {
    var el = document.getElementById('id_locations_' + participant_id);
    var options = [].slice.call(el.options);
    var locations = options.map(
        function (o) {
            return {'id': o.value, 'name': o.textContent, 'option': o}; });
    return locations;
}

function get_participants() {
    var el = document.getElementById('id_participants');
    var options = [].slice.call(el.options);
    var participants = options.map(
        function (o) {
            var locations = get_locations(o.value);
            return {'id': o.value, 'name': o.textContent, 'option': o,
                    'locations': locations}; });
    return participants;
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function get_form_participants_label() {
    var participantLabel = document.querySelector('.event_form > .participants label');
    if (participantLabel) {
        participantLabel.setAttribute('for', '');
    } else {
        participantLabel = document.createElement('label');
        participantLabel.textContent = 'Participants:';
    }
    return participantLabel;
}

function make_linked_checkbox(get_fn, set_fn) {
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = get_fn();
    chk.addEventListener(
        'click', function () {
            set_fn(!get_fn()); chk.checked = get_fn();}, false);
    return chk;
}

function make_labeled_checkbox(name, chk) {
    var label = document.createElement('label');
    var nameobject = document.createElement('span');
    nameobject.textContent = name;
    label.appendChild(chk);
    label.appendChild(nameobject);
    return label;
}

function clear_element(domelement) {
    while (domelement.lastChild)
        domelement.removeChild(domelement.lastChild);
}

function make_participant_choices(participantData, locationLabel, locationChoices) {
    function make_participant_choice(participant) {
        var container = document.createElement('div');
        var chk = make_linked_checkbox(
            function () { return participant.option.selected; },
            function (b) {
                participant.option.selected = b;
                update_label(); });
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';

        function update_label() {
            var s = participant.name;
            var locs = participant.locations.filter(
                function (l) { return l.option.selected; });
            var locNames = locs.map(function (l) { return l.name; });
            if (locs.length == 0 || !participant.option.selected)
                link.textContent = participant.name;
            else link.textContent = participant.name + ': ' + locNames.join(', ');
        }

        function set_selected(b) {
            chk.checked = participant.option.selected = b;
            update_label();
        }

        function make_location_choice(loc) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(
                function () { return loc.option.selected; },
                function (b) {
                    loc.option.selected = b;
                    set_selected(true);
                });
            var domelement = make_labeled_checkbox(loc.name, chk);
            locationChoice.appendChild(domelement);
            return locationChoice;
        }

        function show() {
            locationLabel.textContent = participant.name + ':';
            clear_element(locationChoices);
            for (var i = 0; i < participant.locations.length; ++i) {
                var locationChoice = make_location_choice(participant.locations[i]);
                locationChoices.appendChild(locationChoice);
            }
        }

        link.addEventListener('click', show, false);
        update_label();
        container.appendChild(chk);
        container.appendChild(link);
        return {container: container, redraw: update_label};
    }

    var redraw_functions = [];
    function redraw_all() {
        for (var i = 0; i < redraw_functions.length; ++i) redraw_functions[i]();
    }

    function show_location_choice_for_all() {
        var locations = [];
        var locationSelected = [];
        for (var j = 0; j < participantData[0].locations.length; ++j) {
            locations.push([]);
            var sel = false;
            for (var i = 0; i < participantData.length; ++i) {
                locations[j].push(participantData[i].locations[j]);
                if (locations[j][i].option.selected)
                    sel = true;
            }
            locationSelected.push(sel);
        }

        function make_location_choice(index) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(
                function () { return locationSelected[index]; },
                function (b) {
                    for (var j = 0; j < locations[index].length; ++j)
                        locations[index][j].option.selected = b;
                    locationSelected[index] = b;
                    redraw_all();
                });
            var domelement = make_labeled_checkbox(locations[index][0].name, chk);
            locationChoice.appendChild(domelement);
            return locationChoice;
        }

        locationLabel.textContent = 'Alle:';
        clear_element(locationChoices);
        for (var i = 0; i < locations.length; ++i) {
            var locationChoice = make_location_choice(i);
            locationChoices.appendChild(locationChoice);
        }
    }

    function make_all_choice() {
        var container = document.createElement('div');
        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.style.visibility = 'hidden';
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';
        link.textContent = 'Alle';
        link.addEventListener('click', show_location_choice_for_all, false);
        container.appendChild(chk);
        container.appendChild(link);
        return container;
    }

    var choicesDiv = document.createElement('div');
    choicesDiv.appendChild(make_all_choice());
    for (var i = 0; i < participantData.length; ++i) {
        var o = make_participant_choice(participantData[i]);
        redraw_functions.push(o.redraw)
        choicesDiv.appendChild(o.container);
    }
    return choicesDiv;
}

function setup_form(participantData, container) {
    var participantDiv = document.createElement('div');
    participantDiv.className = 'field';
    var participantLabel = get_form_participants_label();
    var locationDiv = document.createElement('div');
    locationDiv.className = 'field';
    var locationLabel = document.createElement('label');
    var locationChoices = document.createElement('div');
    var participantChoices = make_participant_choices(
        participantData, locationLabel, locationChoices);

    participantDiv.appendChild(participantLabel);
    participantDiv.appendChild(participantChoices);
    locationDiv.appendChild(locationLabel);
    locationDiv.appendChild(locationChoices);
    container.appendChild(participantDiv);
    container.appendChild(locationDiv);
}

function init() {
    var participants = get_participants();
    console.log(participants);
    hide(document.getElementById('participant_locations'));
    hide(document.querySelector('.event_form > .participants'));
    var event_form_div = document.querySelector('.event_form');
    var container = document.createElement('div');
    setup_form(participants, container);
    event_form_div.appendChild(container);
}

window.addEventListener('load', init, false);
