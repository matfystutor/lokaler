// vim:set ft=javascript:
function get_locations(el) {
    var options = [].slice.call(el.options);
    var locations = options.map(
        (o) => ({'id': o.value, 'name': o.textContent,
                 get selected() {return o.selected;},
                 set selected(b) {o.selected = b;}}));
    return locations;
}

function get_participant_form(participant_id) {
    var container = document.getElementById('p' + participant_id);
    var prefix = `id_p${participant_id}-`;
    var field_names = [
        'name', 'day', 'start_time', 'end_time', 'manual_time', 'locations'];
    var fields = {container: container};
    for (let field_name of field_names) {
        fields[field_name] = document.getElementById(prefix + field_name);
    }
    return fields;
}

function get_participants() {
    // Find the <select multiple> that lets us choose which participants
    // are part of this event.
    var el = document.getElementById('id_participants');
    // Map each option of the <select multiple> to a participant object.
    var options = [].slice.call(el.options);
    var participants = options.map((o) => {
        var f = get_participant_form(o.value);
        var locations = get_locations(f['locations']);
        return {id: o.value, name: o.textContent,
                set selected(b) { o.selected = b; },
                get selected() { return o.selected; },
                container: f.container,
                locations: locations, form: f}; });
    return participants;
}

function make_visible(domelement) {
    if (domelement) domelement.style.display = '';
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function hide_all(domelements) {
    for (let e of domelements) hide(e);
}

function make_linked_checkbox(get_fn, set_fn) {
    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = get_fn();
    chk.addEventListener(
        'click', () => {
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
            () => {return participant.selected;},
            (b) => {participant.selected = b; update_label();});
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';

        function update_label() {
            var s = participant.name;
            var locs = participant.locations.filter(
                (l) => l.selected);
            var locNames = locs.map((l) => l.name);
            if (locs.length == 0 || !participant.selected)
                link.textContent = participant.name;
            else link.textContent = participant.name + ': ' + locNames.join(', ');
        }

        function set_participant_selected(b) {
            chk.checked = b; participant.selected = b; update_label();
        }

        function make_location_choice(loc) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(
                () => {return loc.selected;},
                (b) => {loc.selected = b; set_participant_selected(true); });
            var domelement = make_labeled_checkbox(loc.name, chk);
            locationChoice.appendChild(domelement);
            return locationChoice;
        }

        function show_participant() {
            participantData.forEach((p) => { hide(p.container); });
            make_visible(participant.container);
            clear_element(locationChoices);
            for (let loc of participant.locations) {
                var locationChoice = make_location_choice(loc);
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
        for (let f of redraw_functions) f();
    }

    function show_location_choice_for_all() {
        var locations = [];
        var locationSelected = [];
        for (var j = 0; j < participantData[0].locations.length; ++j) {
            locations.push([]);
            var sel = false;
            for (let i = 0; i < participantData.length; ++i) {
                locations[j].push(participantData[i].locations[j]);
                if (locations[j][i].selected)
                    sel = true;
            }
            locationSelected.push(sel);
        }

        function make_location_choice(index) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(
                () => locationSelected[index],
                (b) => {
                    for (let loc of locations[index]) loc.selected = b;
                    locationSelected[index] = b;
                    redraw_all();
                });
            var domelement = make_labeled_checkbox(locations[index][0].name, chk);
            locationChoice.appendChild(domelement);
            return locationChoice;
        }

        clear_element(locationChoices);
        for (let i = 0; i < locations.length; ++i) {
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
    for (let p of participantData) {
        var o = make_participant_choice(p);
        participants.push(o);
        redraw_functions.push(o.redraw)
        choicesDiv.appendChild(o.container);
    }
    return {container: choicesDiv, all: allForm, participants: participants};
}

function link_together_participant_input(participants, field) {
    function oninput(ev) {
        for (let p of participants)
            p.form[field].value = ev.target.value;
    }
    for (let p of participants)
        p.form[field].addEventListener(
            'input', oninput, false);
}

function link_together_participant_select(participants, field) {
    function onchange(ev) {
        for (let p of participants)
            p.form[field].selectedIndex = ev.target.selectedIndex;
    }
    for (let p of participants)
        p.form[field].addEventListener('change', onchange, false);
}

function link_together_participant_fields(participants) {
    var field_names = [
        'name', 'start_time', 'end_time', 'manual_time'];
    for (let f of field_names)
        link_together_participant_input(participants, f);
    link_together_participant_select(participants, 'day');
}

function setup_form(participantData) {
    var event_form_div = document.createElement('div');
    event_form_div.className = 'event_form';
    var container = document.createElement('div');

    var formDiv = document.createElement('div');
    formDiv.className = 'field event_form';

    link_together_participant_fields(participantData);

    for (let p of participantData)
        formDiv.appendChild(p.container);

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
    for (let p of participants) { hide(p.container); hide(p.form.locations); }
    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    var event_form_div = setup_form(participants);
    formelement.insertBefore(event_form_div, formelement.firstChild);
}

window.addEventListener('load', init, false);
