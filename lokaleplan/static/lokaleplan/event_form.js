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

function make_linked_checkbox(dataSource, update) {
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = dataSource.selected;
    chk.addEventListener(
        'click', function () {
            dataSource.selected = chk.checked = !dataSource.selected;}, false);
    if (update) chk.addEventListener('click', update, false);
    return chk;
}

function clear_element(domelement) {
    while (domelement.lastChild)
        domelement.removeChild(domelement.lastChild);
}

function make_participant_choices(participantData, locationLabel, locationChoices) {
    var choicesDiv = document.createElement('div');
    var participantLabelUpdaters = [];
    var currentIndex = null;

    function make_location_choice(index, container, onchange) {
        var label = document.createElement('label');
        var participant = participantData[currentIndex];
        var loc = participant.locations[index];
        var chk = make_linked_checkbox(loc.option, onchange);
        var name = document.createElement('span');
        name.textContent = loc.name;
        label.appendChild(chk);
        label.appendChild(name);
        container.appendChild(label);
    }

    function show(index) {
        var participant = participantData[index];
        currentIndex = index;
        locationLabel.textContent = participant.name + ':';
        clear_element(locationChoices);
        for (var i = 0; i < participant.locations.length; ++i) {
            var locationChoice = document.createElement('div');
            make_location_choice(i, locationChoice, participantLabelUpdaters[index]);
            locationChoices.appendChild(locationChoice);
        }
    }

    function update_participant_label(participant, link) {
        var s = participant.name;
        var locs = participant.locations.filter(
            function (l) { return l.option.selected; });
        var locNames = locs.map(function (l) { return l.name; });
        if (locs.length == 0) link.textContent = participant.name;
        else link.textContent = participant.name + ': ' + locNames.join(', ');
    }

    function make_participant_choice(index, container) {
        var participant = participantData[index];
        var chk = make_linked_checkbox(participant.option, null);
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';
        link.addEventListener('click', show.bind(null, index), false);
        container.appendChild(chk);
        container.appendChild(link);
        participantLabelUpdaters[index] = update_participant_label.bind(
            null, participant, link);
        participantLabelUpdaters[index]();
    }

    for (var i = 0; i < participantData.length; ++i) {
        var choiceDiv = document.createElement('div');
        make_participant_choice(i, choiceDiv);
        choicesDiv.appendChild(choiceDiv);
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
