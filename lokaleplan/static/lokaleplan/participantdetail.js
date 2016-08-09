'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

// vim:set ft=javascript sw=4 et:

function get_events() {
    var events = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = document.getElementsByClassName("event")[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var e = _step.value;

            var day = e.getAttribute('data-day');

            var _e$getAttribute$split = e.getAttribute('data-end-time').split(':');

            var _e$getAttribute$split2 = _slicedToArray(_e$getAttribute$split, 2);

            var hour = _e$getAttribute$split2[0];
            var minute = _e$getAttribute$split2[1];

            events.push({
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                element: e
            });
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

    var k = function k(e) {
        return [e.day, e.hour, e.minute];
    };
    var lt = function lt(a, b) {
        return a.day != b.day ? a.day < b.day : a.hour != b.hour ? a.hour < b.hour : a.minute < b.minute;
    };
    events.sort(function (a, b) {
        return lt(a, b) ? -1 : lt(b, a) ? 1 : 0;
    });
    return events;
}

function no_highlight() {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = document.getElementsByClassName('highlighted')[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var e = _step2.value;

            e.classList.remove('highlighted');
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

function highlight_event(row) {
    row.classList.add('highlighted');
}

function highlight(day, hour, minute) {
    var events = get_events().filter(function (e) {
        return day === e.day && (hour === e.hour ? minute <= e.minute : hour <= e.hour);
    });
    no_highlight();
    if (events.length > 0) highlight_event(events[0].element);
}

function highlight_now() {
    var d = new Date();
    highlight(d.getDay(), d.getHours(), d.getMinutes());
}

window.addEventListener('load', highlight_now, false);
setInterval(highlight_now, 60000);