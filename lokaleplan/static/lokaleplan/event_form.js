function get_locations(el) {
    var options = [].slice.call(el.options);
    var locations = options.map(
        function (o) {
            return {'id': o.value, 'name': o.textContent, 'option': o}; });
    return locations;
}

function get_participant_form(participant_id) {
    var container = document.getElementById('p' + participant_id);
    var prefix = 'id_p' + participant_id + '-';
    var field_names = [
        'name', 'day', 'start_time', 'end_time', 'manual_time', 'locations'];
    var fields = {container: container};
    for (var i = 0; i < field_names.length; ++i) {
        var field_name = field_names[i];
        fields[field_name] = document.getElementById(prefix + field_name);
    }
    return fields;
}

function get_participants() {
    var el = document.getElementById('id_participants');
    var options = [].slice.call(el.options);
    var participants = options.map(
        function (o) {
            var f = get_participant_form(o.value);
            var locations = get_locations(f['locations']);
            return {'id': o.value, 'name': o.textContent, 'option': o,
                    'container': f.container,
                    'locations': locations, 'form': f}; });
    return participants;
}

function make_visible(domelement) {
    if (domelement) domelement.style.display = '';
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function hide_all(domelements) {
    [].forEach.call(domelements, hide);
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

function make_participant_forms(participantData, locationChoices) {
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

        function show_participant() {
            participantData.forEach(function (p) { hide(p.container); });
            make_visible(participant.container);
            clear_element(locationChoices);
            for (var i = 0; i < participant.locations.length; ++i) {
                var locationChoice = make_location_choice(participant.locations[i]);
                locationChoices.appendChild(locationChoice);
            }
        }

        link.addEventListener('click', show_participant, false);
        update_label();
        container.appendChild(chk);
        container.appendChild(link);
        return {show: show_participant,
                container: container,
                redraw: update_label,
                participant: participant};
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

        clear_element(locationChoices);
        for (var i = 0; i < locations.length; ++i) {
            var locationChoice = make_location_choice(i);
            locationChoices.appendChild(locationChoice);
        }
    }

    function show_all_form() {
        // Ensure that the name,day,... fields are shown
        // by showing some participant's form.
        participants[0].show();
        // Then, change the location choice to the all choice.
        show_location_choice_for_all();
    }

    function make_all_form() {
        var container = document.createElement('div');
        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.style.visibility = 'hidden';
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';
        link.textContent = 'Alle';
        link.addEventListener('click', show_all_form, false);
        container.appendChild(chk);
        container.appendChild(link);
        return {container: container, show: show_all_form};
    }

    var allForm = make_all_form();
    var choicesDiv = document.createElement('div');
    choicesDiv.appendChild(allForm.container);
    var participants = [];
    for (var i = 0; i < participantData.length; ++i) {
        var o = make_participant_choice(participantData[i]);
        participants.push(o);
        redraw_functions.push(o.redraw)
        choicesDiv.appendChild(o.container);
    }
    return {container: choicesDiv, all: allForm, participants: participants};
}

function link_together_participant_input(participants, field) {
    function oninput(ev) {
        for (var i = 0; i < participants.length; ++i)
            participants[i].form[field].value = ev.target.value;
    }
    for (var i = 0; i < participants.length; ++i)
        participants[i].form[field].addEventListener(
            'input', oninput, false);
}

function link_together_participant_select(participants, field) {
    function onchange(ev) {
        for (var i = 0; i < participants.length; ++i)
            participants[i].form[field].selectedIndex = ev.target.selectedIndex;
    }
    for (var i = 0; i < participants.length; ++i)
        participants[i].form[field].addEventListener(
            'change', onchange, false);
}

function link_together_participant_fields(participants) {
    var field_names = [
        'name', 'start_time', 'end_time', 'manual_time'];
    for (var i = 0; i < field_names.length; ++i)
        link_together_participant_input(participants, field_names[i]);
    link_together_participant_select(participants, 'day');
}

function setup_form(participantData) {
    var event_form_div = document.createElement('div');
    event_form_div.className = 'event_form';
    var container = document.createElement('div');

    var formDiv = document.createElement('div');
    formDiv.className = 'field event_form';

    link_together_participant_fields(participantData);

    participantData.forEach(
        function (p) {
            formDiv.appendChild(p.container); })

    var locationDiv = document.createElement('div');
    var locationFieldDiv = document.createElement('div');
    locationFieldDiv.className = 'field';
    var locationLabel = document.createElement('label');
    locationLabel.textContent = 'Lokaler:';
    var locationChoices = document.createElement('div');
    locationChoices.className = 'locations';

    var participantList = document.createElement('div');
    participantList.className = 'field';
    var participantLabel = document.createElement('label');
    participantLabel.textContent = 'Hold:';
    var participantForms = make_participant_forms(
        participantData, locationChoices);

    participantList.appendChild(participantLabel);
    participantList.appendChild(participantForms.container);
    locationFieldDiv.appendChild(locationLabel);
    locationFieldDiv.appendChild(locationChoices);
    locationDiv.appendChild(locationFieldDiv);
    formDiv.appendChild(locationDiv);

    container.appendChild(participantList);
    container.appendChild(formDiv);

    event_form_div.appendChild(container);
    participantForms.all.show();
    return event_form_div;
}

function init() {
    var participants = get_participants();
    console.log(participants);
    var formelement = participants[0].form.name.form;
    participants.forEach(function (p) { hide(p.container); });
    participants.forEach(function (p) { hide(p.form.locations); });
    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    var event_form_div = setup_form(participants);
    formelement.insertBefore(event_form_div, formelement.firstChild);
}

window.addEventListener('load', init, false);
