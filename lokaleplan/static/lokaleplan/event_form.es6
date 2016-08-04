// vim:set ft=javascript sw=4 et:
function get_locations(el) {
    const options = [].slice.call(el.options);
    const locations = options.map(
        (o) => ({id: o.value, name: o.textContent,
                 get selected() {return o.selected;},
                 set selected(b) {o.selected = b;}}));
    return locations;
}

function get_participant_form(participant_id) {
    const container = document.getElementById('p' + participant_id);
    const prefix = `id_p${participant_id}-`;
    const field_names = [
        'name', 'day', 'start_time', 'end_time', 'manual_time', 'locations'];
    const fields = {container: container};
    for (const field_name of field_names)
        fields[field_name] = document.getElementById(prefix + field_name);
    return fields;
}

function get_participants() {
    // Find the <select multiple> that lets us choose which participants
    // are part of this event.
    const el = document.getElementById('id_participants');
    // Map each option of the <select multiple> to a participant object.
    const options = [].slice.call(el.options);
    const participants = options.map((o) => {
        const f = get_participant_form(o.value);
        const locations = get_locations(f['locations']);
        return {id: o.value, name: o.textContent,
                set selected(b) { o.selected = b; },
                get selected() { return o.selected; },
                container: f.container,
                locations: locations, form: f}; });
    return participants;
}

function get_participant_groups(participants) {
    const groups = {};
    for (const p of participants) {
        const mo = /^([A-ZÆØÅ]+)(\d+)$/.exec(p.name);
        if (mo) {
            const groupName = mo[1];
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(p);
        }
    }
    const groupList = [];
    for (const k in groups)
        groupList.push({name: k, participants: groups[k]});
    return groupList;
}

function make_visible(domelement) {
    if (domelement) domelement.style.display = '';
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function hide_all(domelements) {
    for (const e of domelements) hide(e);
}

function make_linked_checkbox(get_fn, set_fn) {
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = get_fn();
    chk.addEventListener(
        'click', () => {
            set_fn(!get_fn()); chk.checked = get_fn();}, false);
    return chk;
}

function make_labeled_checkbox(name, chk) {
    const label = document.createElement('label');
    const nameobject = document.createElement('span');
    nameobject.textContent = name;
    label.appendChild(chk);
    label.appendChild(nameobject);
    return label;
}

function clear_element(domelement) {
    while (domelement.lastChild)
        domelement.removeChild(domelement.lastChild);
}

function make_participant_forms(participantData, locationChoices, set_active) {
    function make_participant_choice(participant) {
        const container = document.createElement('div');
        const participantCheckbox = make_linked_checkbox(
            () => participant.selected,
            b => {participant.selected = b; update_label();});
        const link = document.createElement('a');
        link.href = 'javascript:void(0)';

        function update_label() {
            const s = participant.name;
            const locs = participant.locations.filter((l) => l.selected);
            const locNames = locs.map((l) => l.name);
            if (locs.length == 0 || !participant.selected)
                link.textContent = participant.name;
            else link.textContent = participant.name + ': ' + locNames.join(', ');
        }

        function show_participant() {
            set_active([participant], 'Data for ' + participant.name + ':');
            for (const p of participantData) hide(p.container);
            make_visible(participant.container);
            clear_element(locationChoices);
            for (const loc of participant.locations) {
                const locationChoice = document.createElement('div');
                const locationCheckbox = make_linked_checkbox(
                    () => loc.selected,
                    b => {loc.selected = b;
                            participantCheckbox.checked =
                                participant.selected = true;
                            update_label(); });
                const domelement = make_labeled_checkbox(loc.name, locationCheckbox);
                locationChoice.appendChild(domelement);
                locationChoices.appendChild(locationChoice);
            }
        }

        link.addEventListener('click', show_participant, false);
        update_label();
        container.appendChild(participantCheckbox);
        container.appendChild(link);
        return {show: show_participant,
                get selected() { return participant.selected; },
                set selected(b) {
                    participant.selected = participantCheckbox.checked = b;
                    update_label();
                },
                container: container,
                redraw: update_label,
                participant: participant};
    }

    function redraw_group(group) {
        for (const p of group) participants[p.id].redraw();
    }

    function show_location_choice_for_group(group, onchange) {
        const locations = [];
        const locationSelected = [];
        for (let j = 0; j < group[0].locations.length; ++j) {
            locations.push([]);
            let sel = false;
            for (const p of group) {
                locations[j].push(p.locations[j]);
                if (p.locations[j].selected) sel = true;
            }
            locationSelected.push(sel);
        }

        clear_element(locationChoices);
        for (let i = 0; i < locations.length; ++i) {
            const locationChoice = document.createElement('div');
            const chk = make_linked_checkbox(
                () => locationSelected[i],
                b => {
                    for (const loc of locations[i]) loc.selected = b;
                    locationSelected[i] = b;
                    redraw_group(group);
                    onchange();
                });
            const domelement = make_labeled_checkbox(locations[i][0].name, chk);
            locationChoice.appendChild(domelement);
            locationChoices.appendChild(locationChoice);
        }
    }

    function show_group_form(group, enable_onchange) {
        // Ensure that the name,day,... fields are shown
        // by showing some participant's form.
        participants[group[0].id].show();

        const target = (enable_onchange ?
            group[0].name.substring(0, group[0].name.length - 1) : 'alle');
        const label = 'Data for ' + target + ':';

        if (enable_onchange)
            set_active(group, label);
        else
            set_active(participantData, label);

        function enable() {
            for (const p of group)
                participants[p.id].selected = true;
        }

        const onchange = enable_onchange ? enable : (() => {});
        show_location_choice_for_group(group, onchange);
    }

    function make_group_form(group, name, enable_onchange=true) {
        const container = document.createElement('div');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.style.visibility = 'hidden';
        const link = document.createElement('a');
        link.href = 'javascript:void(0)';
        link.textContent = name;
	const show = () => show_group_form(group, enable_onchange);
        link.addEventListener('click', show, false);
        container.appendChild(chk);
        container.appendChild(link);
        return {container: container, show: show};
    }

    function make_all_form() {
        return make_group_form(participantData, 'Alle', false);
    }

    const allForm = make_all_form();
    const choicesDiv = document.createElement('div');
    choicesDiv.appendChild(allForm.container);
    for (const g of get_participant_groups(participantData)) {
        const {name: group_name, participants: group} = g;
        const group_form = make_group_form(group, group_name);
        choicesDiv.appendChild(group_form.container);
    }
    const participants = {};
    for (const p of participantData) {
        const o = make_participant_choice(p);
        participants[o.participant.id] = o;
        choicesDiv.appendChild(o.container);
    }
    return {container: choicesDiv, all: allForm, participants: participants};
}

function link_together_participant_input(participants, field, get_active) {
    function oninput(ev) {
        for (const p of get_active())
            p.form[field].value = ev.target.value;
    }
    for (const p of participants)
        p.form[field].addEventListener('input', oninput, false);
}

function link_together_participant_select(participants, field, get_active) {
    function onchange(ev) {
        for (const p of get_active())
            p.form[field].selectedIndex = ev.target.selectedIndex;
    }
    for (const p of participants)
        p.form[field].addEventListener('change', onchange, false);
}

function link_together_participant_fields(participants, get_active) {
    const field_names = ['name', 'start_time', 'end_time', 'manual_time'];
    for (const f of field_names)
        link_together_participant_input(participants, f, get_active);
    link_together_participant_select(participants, 'day', get_active);
}

function setup_form(participantData) {
    const event_form_div = document.createElement('div');
    event_form_div.className = 'event_form';
    const container = document.createElement('div');

    const formDiv = document.createElement('div');
    formDiv.className = 'field event_form';

    const formLabel = document.createElement('label');
    formLabel.textContent = 'Data for alle:';
    formDiv.appendChild(formLabel);

    let active_participants = [];
    link_together_participant_fields(
        participantData, () => active_participants);

    for (const p of participantData)
        formDiv.appendChild(p.container);

    const locationDiv = document.createElement('div');
    const locationFieldDiv = document.createElement('div');
    locationFieldDiv.className = 'field';
    const locationLabel = document.createElement('label');
    locationLabel.textContent = 'Lokaler:';
    const locationChoices = document.createElement('div');
    locationChoices.className = 'locations';

    const participantList = document.createElement('div');
    participantList.className = 'field';
    const participantLabel = document.createElement('label');
    participantLabel.textContent = 'Hold:';
    const participantForms = make_participant_forms(
        participantData, locationChoices,
        (p, l) => {active_participants = p; formLabel.textContent = l;});

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
    const participants = get_participants();
    console.log(participants);
    const formelement = participants[0].form.name.form;
    for (const p of participants) { hide(p.container); hide(p.form.locations); }
    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    const event_form_div = setup_form(participants);
    formelement.insertBefore(event_form_div, formelement.firstChild);
}

window.addEventListener('load', init, false);
