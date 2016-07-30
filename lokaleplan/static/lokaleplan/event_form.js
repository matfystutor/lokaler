'use strict';

// vim:set ft=javascript:
function get_locations(el) {
    var options = [].slice.call(el.options);
    var locations = options.map(function (o) {
        return { 'id': o.value, 'name': o.textContent,
            get selected() {
                return o.selected;
            },
            set selected(b) {
                o.selected = b;
            } };
    });
    return locations;
}

function get_participant_form(participant_id) {
    var container = document.getElementById('p' + participant_id);
    var prefix = 'id_p' + participant_id + '-';
    var field_names = ['name', 'day', 'start_time', 'end_time', 'manual_time', 'locations'];
    var fields = { container: container };
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = field_names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var field_name = _step.value;

            fields[field_name] = document.getElementById(prefix + field_name);
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    return fields;
}

function get_participants() {
    // Find the <select multiple> that lets us choose which participants
    // are part of this event.
    var el = document.getElementById('id_participants');
    // Map each option of the <select multiple> to a participant object.
    var options = [].slice.call(el.options);
    var participants = options.map(function (o) {
        var f = get_participant_form(o.value);
        var locations = get_locations(f['locations']);
        return { id: o.value, name: o.textContent,
            set selected(b) {
                o.selected = b;
            },
            get selected() {
                return o.selected;
            },
            container: f.container,
            locations: locations, form: f };
    });
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
    chk.addEventListener('click', function () {
        set_fn(!get_fn());chk.checked = get_fn();
    }, false);
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
    while (domelement.lastChild) {
        domelement.removeChild(domelement.lastChild);
    }
}

function make_participant_forms(participantData, locationChoices) {
    function make_participant_choice(participant) {
        var container = document.createElement('div');
        var chk = make_linked_checkbox(function () {
            return participant.selected;
        }, function (b) {
            participant.selected = b;update_label();
        });
        var link = document.createElement('a');
        link.href = 'javascript:void(0)';

        function update_label() {
            var s = participant.name;
            var locs = participant.locations.filter(function (l) {
                return l.selected;
            });
            var locNames = locs.map(function (l) {
                return l.name;
            });
            if (locs.length == 0 || !participant.selected) link.textContent = participant.name;else link.textContent = participant.name + ': ' + locNames.join(', ');
        }

        function set_participant_selected(b) {
            chk.checked = b;participant.set_selected(b);update_label();
        }

        function make_location_choice(loc) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(function () {
                return loc.selected;
            }, function (b) {
                loc.selected = b;set_participant_selected(true);
            });
            var domelement = make_labeled_checkbox(loc.name, chk);
            locationChoice.appendChild(domelement);
            return locationChoice;
        }

        function show_participant() {
            participantData.forEach(function (p) {
                hide(p.container);
            });
            make_visible(participant.container);
            clear_element(locationChoices);
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = participant.locations[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var loc = _step2.value;

                    var locationChoice = make_location_choice(loc);
                    locationChoices.appendChild(locationChoice);
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }

        link.addEventListener('click', show_participant, false);
        update_label();
        container.appendChild(chk);
        container.appendChild(link);
        return { show: show_participant,
            container: container,
            redraw: update_label,
            participant: participant };
    }

    var redraw_functions = [];
    function redraw_all() {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = redraw_functions[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var f = _step3.value;
                f();
            }
        } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                }
            } finally {
                if (_didIteratorError3) {
                    throw _iteratorError3;
                }
            }
        }
    }

    function show_location_choice_for_all() {
        var locations = [];
        var locationSelected = [];
        for (var j = 0; j < participantData[0].locations.length; ++j) {
            locations.push([]);
            var sel = false;
            for (var i = 0; i < participantData.length; ++i) {
                locations[j].push(participantData[i].locations[j]);
                if (locations[j][i].selected) sel = true;
            }
            locationSelected.push(sel);
        }

        function make_location_choice(index) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(function () {
                return locationSelected[index];
            }, function (b) {
                for (var j = 0; j < locations[index].length; ++j) {
                    locations[index][j].set_selected(b);
                }locationSelected[index] = b;
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
        return { container: container, show: show_all_form };
    }

    var allForm = make_all_form();
    var choicesDiv = document.createElement('div');
    choicesDiv.appendChild(allForm.container);
    var participants = [];
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = participantData[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var p = _step4.value;

            var o = make_participant_choice(p);
            participants.push(o);
            redraw_functions.push(o.redraw);
            choicesDiv.appendChild(o.container);
        }
    } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
            }
        } finally {
            if (_didIteratorError4) {
                throw _iteratorError4;
            }
        }
    }

    return { container: choicesDiv, all: allForm, participants: participants };
}

function link_together_participant_input(participants, field) {
    function oninput(ev) {
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
            for (var _iterator5 = participants[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var p = _step5.value;

                p.form[field].value = ev.target.value;
            }
        } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                    _iterator5.return();
                }
            } finally {
                if (_didIteratorError5) {
                    throw _iteratorError5;
                }
            }
        }
    }
    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = participants[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var p = _step6.value;

            p.form[field].addEventListener('input', oninput, false);
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }
}

function link_together_participant_select(participants, field) {
    function onchange(ev) {
        var _iteratorNormalCompletion7 = true;
        var _didIteratorError7 = false;
        var _iteratorError7 = undefined;

        try {
            for (var _iterator7 = participants[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                var p = _step7.value;

                p.form[field].selectedIndex = ev.target.selectedIndex;
            }
        } catch (err) {
            _didIteratorError7 = true;
            _iteratorError7 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion7 && _iterator7.return) {
                    _iterator7.return();
                }
            } finally {
                if (_didIteratorError7) {
                    throw _iteratorError7;
                }
            }
        }
    }
    var _iteratorNormalCompletion8 = true;
    var _didIteratorError8 = false;
    var _iteratorError8 = undefined;

    try {
        for (var _iterator8 = participants[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
            var p = _step8.value;

            p.form[field].addEventListener('change', onchange, false);
        }
    } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion8 && _iterator8.return) {
                _iterator8.return();
            }
        } finally {
            if (_didIteratorError8) {
                throw _iteratorError8;
            }
        }
    }
}

function link_together_participant_fields(participants) {
    var field_names = ['name', 'start_time', 'end_time', 'manual_time'];
    var _iteratorNormalCompletion9 = true;
    var _didIteratorError9 = false;
    var _iteratorError9 = undefined;

    try {
        for (var _iterator9 = field_names[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var f = _step9.value;

            link_together_participant_input(participants, f);
        }
    } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                _iterator9.return();
            }
        } finally {
            if (_didIteratorError9) {
                throw _iteratorError9;
            }
        }
    }

    link_together_participant_select(participants, 'day');
}

function setup_form(participantData) {
    var event_form_div = document.createElement('div');
    event_form_div.className = 'event_form';
    var container = document.createElement('div');

    var formDiv = document.createElement('div');
    formDiv.className = 'field event_form';

    link_together_participant_fields(participantData);

    participantData.forEach(function (p) {
        formDiv.appendChild(p.container);
    });

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
    var participantForms = make_participant_forms(participantData, locationChoices);

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
    participants.forEach(function (p) {
        hide(p.container);
    });
    participants.forEach(function (p) {
        hide(p.form.locations);
    });
    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    var event_form_div = setup_form(participants);
    formelement.insertBefore(event_form_div, formelement.firstChild);
}

window.addEventListener('load', init, false);