'use strict';

// vim:set ft=javascript:
function get_locations(el) {
    var options = [].slice.call(el.options);
    var locations = options.map(function (o) {
        return { id: o.value, name: o.textContent,
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

function get_participant_groups(participants) {
    var groups = {};
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = participants[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var p = _step2.value;

            var mo = /^([A-ZÆØÅ]+)(\d+)$/.exec(p.name);
            if (mo) {
                var groupName = mo[1];
                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(p);
            }
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

    var groupList = [];
    for (var k in groups) {
        groupList.push({ name: k, participants: groups[k] });
    }return groupList;
}

function make_visible(domelement) {
    if (domelement) domelement.style.display = '';
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function hide_all(domelements) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = domelements[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var e = _step3.value;
            hide(e);
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
        var participantCheckbox = make_linked_checkbox(function () {
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

        function show_participant() {
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = participantData[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var p = _step4.value;
                    hide(p.container);
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

            make_visible(participant.container);
            clear_element(locationChoices);
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                var _loop = function _loop() {
                    var loc = _step5.value;

                    var locationChoice = document.createElement('div');
                    var locationCheckbox = make_linked_checkbox(function () {
                        return loc.selected;
                    }, function (b) {
                        loc.selected = b;
                        participantCheckbox.checked = participant.selected = true;
                        update_label();
                    });
                    var domelement = make_labeled_checkbox(loc.name, locationCheckbox);
                    locationChoice.appendChild(domelement);
                    locationChoices.appendChild(locationChoice);
                };

                for (var _iterator5 = participant.locations[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    _loop();
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

        link.addEventListener('click', show_participant, false);
        update_label();
        container.appendChild(participantCheckbox);
        container.appendChild(link);
        return { show: show_participant,
            container: container,
            redraw: update_label,
            participant: participant };
    }

    function redraw_all() {
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
            for (var _iterator6 = participantData[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var p = _step6.value;
                participants[p.id].redraw();
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

    function show_location_choice_for_all() {
        var locations = [];
        var locationSelected = [];
        for (var j = 0; j < participantData[0].locations.length; ++j) {
            locations.push([]);
            var sel = false;
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = participantData[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var p = _step7.value;

                    locations[j].push(p.locations[j]);
                    if (p.locations[j].selected) sel = true;
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

            locationSelected.push(sel);
        }

        clear_element(locationChoices);

        var _loop2 = function _loop2(i) {
            var locationChoice = document.createElement('div');
            var chk = make_linked_checkbox(function () {
                return locationSelected[i];
            }, function (b) {
                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = locations[i][Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var _loc = _step8.value;
                        _loc.selected = b;
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

                locationSelected[i] = b;
                redraw_all();
            });
            var domelement = make_labeled_checkbox(locations[i][0].name, chk);
            locationChoice.appendChild(domelement);
            locationChoices.appendChild(locationChoice);
        };

        for (var i = 0; i < locations.length; ++i) {
            _loop2(i);
        }
    }

    function show_all_form() {
        // Ensure that the name,day,... fields are shown
        // by showing some participant's form.
        participants[participantData[0].id].show();
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
    var _iteratorNormalCompletion9 = true;
    var _didIteratorError9 = false;
    var _iteratorError9 = undefined;

    try {
        for (var _iterator9 = get_participant_groups(participantData)[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var g = _step9.value;
            var group_name = g.name;
            var group = g.participants;
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

    var participants = {};
    var _iteratorNormalCompletion10 = true;
    var _didIteratorError10 = false;
    var _iteratorError10 = undefined;

    try {
        for (var _iterator10 = participantData[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
            var p = _step10.value;

            var o = make_participant_choice(p);
            participants[o.participant.id] = o;
            choicesDiv.appendChild(o.container);
        }
    } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion10 && _iterator10.return) {
                _iterator10.return();
            }
        } finally {
            if (_didIteratorError10) {
                throw _iteratorError10;
            }
        }
    }

    return { container: choicesDiv, all: allForm, participants: participants };
}

function link_together_participant_input(participants, field) {
    function oninput(ev) {
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
            for (var _iterator11 = participants[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                var p = _step11.value;

                p.form[field].value = ev.target.value;
            }
        } catch (err) {
            _didIteratorError11 = true;
            _iteratorError11 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion11 && _iterator11.return) {
                    _iterator11.return();
                }
            } finally {
                if (_didIteratorError11) {
                    throw _iteratorError11;
                }
            }
        }
    }
    var _iteratorNormalCompletion12 = true;
    var _didIteratorError12 = false;
    var _iteratorError12 = undefined;

    try {
        for (var _iterator12 = participants[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
            var p = _step12.value;

            p.form[field].addEventListener('input', oninput, false);
        }
    } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
            }
        } finally {
            if (_didIteratorError12) {
                throw _iteratorError12;
            }
        }
    }
}

function link_together_participant_select(participants, field) {
    function onchange(ev) {
        var _iteratorNormalCompletion13 = true;
        var _didIteratorError13 = false;
        var _iteratorError13 = undefined;

        try {
            for (var _iterator13 = participants[Symbol.iterator](), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
                var p = _step13.value;

                p.form[field].selectedIndex = ev.target.selectedIndex;
            }
        } catch (err) {
            _didIteratorError13 = true;
            _iteratorError13 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion13 && _iterator13.return) {
                    _iterator13.return();
                }
            } finally {
                if (_didIteratorError13) {
                    throw _iteratorError13;
                }
            }
        }
    }
    var _iteratorNormalCompletion14 = true;
    var _didIteratorError14 = false;
    var _iteratorError14 = undefined;

    try {
        for (var _iterator14 = participants[Symbol.iterator](), _step14; !(_iteratorNormalCompletion14 = (_step14 = _iterator14.next()).done); _iteratorNormalCompletion14 = true) {
            var p = _step14.value;

            p.form[field].addEventListener('change', onchange, false);
        }
    } catch (err) {
        _didIteratorError14 = true;
        _iteratorError14 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion14 && _iterator14.return) {
                _iterator14.return();
            }
        } finally {
            if (_didIteratorError14) {
                throw _iteratorError14;
            }
        }
    }
}

function link_together_participant_fields(participants) {
    var field_names = ['name', 'start_time', 'end_time', 'manual_time'];
    var _iteratorNormalCompletion15 = true;
    var _didIteratorError15 = false;
    var _iteratorError15 = undefined;

    try {
        for (var _iterator15 = field_names[Symbol.iterator](), _step15; !(_iteratorNormalCompletion15 = (_step15 = _iterator15.next()).done); _iteratorNormalCompletion15 = true) {
            var f = _step15.value;

            link_together_participant_input(participants, f);
        }
    } catch (err) {
        _didIteratorError15 = true;
        _iteratorError15 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion15 && _iterator15.return) {
                _iterator15.return();
            }
        } finally {
            if (_didIteratorError15) {
                throw _iteratorError15;
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

    var _iteratorNormalCompletion16 = true;
    var _didIteratorError16 = false;
    var _iteratorError16 = undefined;

    try {
        for (var _iterator16 = participantData[Symbol.iterator](), _step16; !(_iteratorNormalCompletion16 = (_step16 = _iterator16.next()).done); _iteratorNormalCompletion16 = true) {
            var p = _step16.value;

            formDiv.appendChild(p.container);
        }
    } catch (err) {
        _didIteratorError16 = true;
        _iteratorError16 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion16 && _iterator16.return) {
                _iterator16.return();
            }
        } finally {
            if (_didIteratorError16) {
                throw _iteratorError16;
            }
        }
    }

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
    var _iteratorNormalCompletion17 = true;
    var _didIteratorError17 = false;
    var _iteratorError17 = undefined;

    try {
        for (var _iterator17 = participants[Symbol.iterator](), _step17; !(_iteratorNormalCompletion17 = (_step17 = _iterator17.next()).done); _iteratorNormalCompletion17 = true) {
            var p = _step17.value;
            hide(p.container);hide(p.form.locations);
        }
    } catch (err) {
        _didIteratorError17 = true;
        _iteratorError17 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion17 && _iterator17.return) {
                _iterator17.return();
            }
        } finally {
            if (_didIteratorError17) {
                throw _iteratorError17;
            }
        }
    }

    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    var event_form_div = setup_form(participants);
    formelement.insertBefore(event_form_div, formelement.firstChild);
}

window.addEventListener('load', init, false);