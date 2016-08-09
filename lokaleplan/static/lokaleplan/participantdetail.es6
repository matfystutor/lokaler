// vim:set ft=javascript sw=4 et:

function get_events() {
    const events = [];
    for (const e of document.getElementsByClassName("event")) {
        const day = e.getAttribute('data-day');
        const [hour, minute] = e.getAttribute('data-end-time').split(':');
        events.push({
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            element: e,
        });
    }
    const k = e => [e.day, e.hour, e.minute];
    const lt = (a, b) =>
        (a.day != b.day) ? (a.day < b.day) :
        (a.hour != b.hour) ? (a.hour < b.hour) :
        (a.minute < b.minute);
    events.sort((a, b) => lt(a, b) ? -1 : (lt(b, a) ? 1 : 0));
    return events;
}

function no_highlight() {
    for (const e of document.getElementsByClassName('highlighted'))
        e.classList.remove('highlighted');
}

function highlight_event(row) {
    row.classList.add('highlighted');
}

function highlight(day, hour, minute) {
    const events = get_events().filter(e =>
        day === e.day &&
        (hour === e.hour ?
         (minute <= e.minute) :
         (hour <= e.hour)));
    no_highlight();
    if (events.length > 0) highlight_event(events[0].element);
}

function highlight_now() {
    const d = new Date();
    highlight(d.getDay(), d.getHours(), d.getMinutes());
}

window.addEventListener('load', highlight_now, false);
setInterval(highlight_now, 60000);
