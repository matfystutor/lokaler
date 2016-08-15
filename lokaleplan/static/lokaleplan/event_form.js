'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

// vim:set ft=javascript sw=4 et:
function get_locations(el) {
    var options = [].slice.call(el.options);
    var locations = options.map(function (option) {
        var loc = { id: option.value, name: option.textContent,
            _selected: option.selected,
            get selected() {
                return loc._selected;
            },
            set selected(b) {
                loc._selected = option.selected = b;
            } };
        return loc;
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
        var p = {
            _name: f.name.value, get event_name() {
                return p._name;
            },
            set event_name(s) {
                p._name = f.name.value = s;
            },
            _day: f.day.value, get day() {
                return p._day;
            },
            set day(s) {
                p._day = f.day.value = s;
            },
            _start_time: f.start_time.value, get start_time() {
                return p._start_time;
            },
            set start_time(s) {
                p._start_time = f.start_time.value = s;
            },
            _end_time: f.end_time.value, get end_time() {
                return p._end_time;
            },
            set end_time(s) {
                p._end_time = f.end_time.value = s;
            },
            _manual_time: f.manual_time.value, get manual_time() {
                return p._manual_time;
            },
            set manual_time(s) {
                p._manual_time = f.manual_time.value = s;
            },
            _selected: o.selected, get selected() {
                return p._selected;
            },
            set selected(b) {
                p._selected = o.selected = b;
            },
            locations: get_locations(f['locations']),
            id: o.value, name: o.textContent
        };
        return p;
    });
    return participants;
}

function set_participant_field(participant, key, value) {
    if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === _typeof([]) && key[0] === 'locations') participant.locations[key[1]].selected = value;else if (key in participant) participant[key] = value;else throw 'Unknown key ' + key;
}

function get_participant_groups(participants) {
    var groups = {};
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = participants[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var p = _step2.value;

            // Hack to support DATAM => DAT group
            var mo = /^([A-ZÆØÅ]+)(\d+|AM)$/.exec(p.name);
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
    groupList.push({ name: 'Alle', participants: participants });
    for (var k in groups) {
        groupList.push({ name: k, participants: groups[k] });
    }return groupList;
}

function all(xs) {
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = xs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var x = _step3.value;
            if (!x) return false;
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

    return true;
}

function any(xs) {
    var f = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = xs[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var x = _step4.value;
            if (f ? f(x) : x) return true;
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

    return false;
}

function hide(domelement) {
    if (domelement) domelement.style.display = 'none';
}

function hide_all(domelements) {
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = domelements[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var e = _step5.value;
            hide(e);
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

var ParticipantOption = (function (_React$Component) {
    _inherits(ParticipantOption, _React$Component);

    function ParticipantOption() {
        _classCallCheck(this, ParticipantOption);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ParticipantOption).apply(this, arguments));
    }

    _createClass(ParticipantOption, [{
        key: 'render',
        value: function render() {
            var _this2 = this;

            return React.createElement(
                'div',
                null,
                React.createElement('input', { type: 'checkbox', checked: this.props.selected,
                    onChange: function onChange(e) {
                        return _this2.props.onToggle(e.target.checked);
                    } }),
                React.createElement(
                    'a',
                    { href: 'javascript:void(0)', onClick: this.props.onClick },
                    this.props.label
                )
            );
        }
    }]);

    return ParticipantOption;
})(React.Component);

var DaySelect = (function (_React$Component2) {
    _inherits(DaySelect, _React$Component2);

    function DaySelect() {
        _classCallCheck(this, DaySelect);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(DaySelect).apply(this, arguments));
    }

    _createClass(DaySelect, [{
        key: 'render',
        value: function render() {
            var _this4 = this;

            return React.createElement(
                'select',
                { value: this.props.value, onChange: function onChange(e) {
                        return _this4.props.onChange(e.target.value);
                    } },
                React.createElement(
                    'option',
                    { value: '3' },
                    'Onsdag'
                ),
                React.createElement(
                    'option',
                    { value: '4' },
                    'Torsdag'
                ),
                React.createElement(
                    'option',
                    { value: '5' },
                    'Fredag'
                )
            );
        }
    }]);

    return DaySelect;
})(React.Component);

var ParticipantLocations = (function (_React$Component3) {
    _inherits(ParticipantLocations, _React$Component3);

    function ParticipantLocations() {
        _classCallCheck(this, ParticipantLocations);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ParticipantLocations).apply(this, arguments));
    }

    _createClass(ParticipantLocations, [{
        key: 'shouldComponentUpdate',
        value: function shouldComponentUpdate(nextProps, nextState) {
            return this.props != nextProps;
        }
    }, {
        key: 'render',
        value: function render() {
            var _this6 = this;

            var options = this.props.names.map(function (name, i) {
                var s = _this6.props.selected[i];
                return React.createElement(
                    'div',
                    { key: i },
                    React.createElement(
                        'label',
                        null,
                        React.createElement('input', { type: 'checkbox', checked: s,
                            onChange: function onChange(e) {
                                return _this6.props.onChange(i, e.target.checked);
                            } }),
                        React.createElement(
                            'span',
                            null,
                            name
                        )
                    )
                );
            });
            return React.createElement(
                'div',
                { className: 'locations' },
                options
            );
        }
    }]);

    return ParticipantLocations;
})(React.Component);

var ParticipantUpdate = (function (_React$Component4) {
    _inherits(ParticipantUpdate, _React$Component4);

    function ParticipantUpdate() {
        _classCallCheck(this, ParticipantUpdate);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ParticipantUpdate).apply(this, arguments));
    }

    _createClass(ParticipantUpdate, [{
        key: 'render',
        value: function render() {
            var _this8 = this;

            var _props$participants$k = this.props.participants.keys().next();

            var activeParticipant = _props$participants$k.value;
            var noActive = _props$participants$k.done;

            if (noActive) return React.createElement('div', { className: 'field event_form', ref: 'formDiv' });
            return React.createElement(
                'div',
                { className: 'field event_form', ref: 'formDiv' },
                React.createElement(
                    'label',
                    { ref: 'formLabel' },
                    'Data for ',
                    this.props.name,
                    ':'
                ),
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'div',
                        { className: 'field' },
                        React.createElement(
                            'div',
                            { className: 'event_form' },
                            React.createElement(
                                'div',
                                { className: 'time' },
                                React.createElement(
                                    'div',
                                    { className: 'field' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Dag:'
                                    ),
                                    React.createElement(DaySelect, { value: activeParticipant.day,
                                        onChange: function onChange(v) {
                                            return _this8.props.onChange('day', v);
                                        } })
                                ),
                                React.createElement(
                                    'div',
                                    { className: 'field' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Start:'
                                    ),
                                    React.createElement('input', { value: activeParticipant.start_time,
                                        onChange: function onChange(e) {
                                            return _this8.props.onChange('start_time', e.target.value);
                                        } })
                                ),
                                React.createElement(
                                    'div',
                                    { className: 'field' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Slut:'
                                    ),
                                    React.createElement('input', { value: activeParticipant.end_time,
                                        onChange: function onChange(e) {
                                            return _this8.props.onChange('end_time', e.target.value);
                                        } })
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'name' },
                                React.createElement(
                                    'div',
                                    { className: 'field' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Navn:'
                                    ),
                                    React.createElement('input', { value: activeParticipant.event_name,
                                        onChange: function onChange(e) {
                                            return _this8.props.onChange('event_name', e.target.value);
                                        } })
                                )
                            ),
                            React.createElement(
                                'div',
                                null,
                                React.createElement(
                                    'div',
                                    { className: 'field' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Tid:'
                                    ),
                                    React.createElement('input', { value: activeParticipant.manual_time,
                                        onChange: function onChange(e) {
                                            return _this8.props.onChange('manual_time', e.target.value);
                                        } })
                                )
                            )
                        )
                    )
                ),
                React.createElement(
                    'div',
                    null,
                    React.createElement(
                        'div',
                        { className: 'field' },
                        React.createElement(
                            'label',
                            null,
                            'Lokaler:'
                        ),
                        React.createElement(ParticipantLocations, {
                            names: activeParticipant.locations.map(function (l) {
                                return l.name;
                            }),
                            selected: activeParticipant.locations.map(function (_, i) {
                                return any(_this8.props.participants, function (p) {
                                    return p.locations[i].selected;
                                });
                            }),
                            onChange: function onChange(i, b) {
                                return _this8.props.onChange(['locations', i], b);
                            } })
                    )
                )
            );
        }
    }]);

    return ParticipantUpdate;
})(React.Component);

var EventForm = (function (_React$Component5) {
    _inherits(EventForm, _React$Component5);

    function EventForm() {
        var _Object$getPrototypeO;

        var _temp, _this9, _ret;

        _classCallCheck(this, EventForm);

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this9 = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(EventForm)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this9), _this9.state = {
            active: new Set(_this9.props.participants),
            activeName: 'Alle'
        }, _temp), _possibleConstructorReturn(_this9, _ret);
    }
    //static defaultProps = {
    //}
    //static propTypes = {
    //    participants: React.PropTypes.array.isRequired,
    //}

    _createClass(EventForm, [{
        key: 'setParticipantsSelected',
        value: function setParticipantsSelected(participants, selected) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = participants[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var p = _step6.value;
                    p.selected = selected;
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

            this.forceUpdate();
        }
    }, {
        key: 'render',
        value: function render() {
            var _this10 = this;

            var participantList = [];
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                var _loop = function _loop() {
                    var _step7$value = _step7.value;
                    var name = _step7$value.name;
                    var participants = _step7$value.participants;

                    participantList.push(React.createElement(ParticipantOption, { key: name, label: name,
                        selected: any(participants.map(function (p) {
                            return p.selected;
                        })),
                        onToggle: function onToggle(b) {
                            return _this10.setParticipantsSelected(participants, b);
                        },
                        onClick: function onClick() {
                            return _this10.setState({ active: new Set(participants), activeName: name });
                        } }));
                };

                for (var _iterator7 = get_participant_groups(this.props.participants)[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    _loop();
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

            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                var _loop2 = function _loop2() {
                    var p = _step8.value;

                    var locations = p.locations.filter(function (l) {
                        return l.selected;
                    }).map(function (l) {
                        return l.name;
                    }).join(', ');
                    var label = p.selected && locations ? p.name + ': ' + locations : p.name;
                    participantList.push(React.createElement(ParticipantOption, { key: p.id, selected: p.selected, label: label,
                        onToggle: function onToggle(b) {
                            return _this10.setParticipantsSelected([p], b);
                        },
                        onClick: function onClick() {
                            return _this10.setState({ active: new Set([p]), activeName: p.name });
                        } }));
                };

                for (var _iterator8 = this.props.participants[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    _loop2();
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

            return React.createElement(
                'div',
                { ref: 'container' },
                React.createElement(
                    'div',
                    { className: 'field', ref: 'participantList' },
                    participantList
                ),
                React.createElement(ParticipantUpdate, { name: this.state.activeName, participants: this.state.active,
                    onChange: function onChange(k, v) {
                        _this10.state.active.forEach(function (p) {
                            return set_participant_field(p, k, v);
                        });
                        if (_this10.state.activeName !== 'Alle') _this10.setParticipantsSelected(_this10.state.active, true);
                        _this10.forceUpdate();
                    } })
            );
        }
    }]);

    return EventForm;
})(React.Component);

function init_react() {
    var participants = get_participants();
    var formelement = document.getElementById('id_participants').form;
    hide_all(participants.map(function (p) {
        return document.getElementById('id_p' + p.id + '-locations');
    }));
    hide_all(participants.map(function (p) {
        return document.getElementById('p' + p.id);
    }));
    hide(document.querySelector('.participants'));
    hide_all(document.querySelectorAll('.participant-name'));
    var event_form_div = document.createElement('div');
    event_form_div.className = 'event_form';
    formelement.insertBefore(event_form_div, formelement.firstChild);
    ReactDOM.render(React.createElement(EventForm, { participants: participants }), event_form_div);
}

window.addEventListener('load', init_react, false);