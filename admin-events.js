
async function getEvents() {
    try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error('Ошибка загрузки');
        return await res.json();
    } catch {
        return [];
    }
}

async function saveEvents(events) {
    await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
    });
}

async function renderEvents() {
    const list = document.getElementById('eventList');
    const events = await getEvents();
    list.innerHTML = '';
    if (!events.length) {
        list.innerHTML = '<p style="text-align:center;color:#aaa;">Нет мероприятий</p>';
        return;
    }
    events.forEach((event, idx) => {
        const div = document.createElement('div');
        div.className = 'event-list-item';
        div.innerHTML = `
            <strong>${event.title}</strong> <br>
            <span>${event.date || ''} ${event.time || ''}</span> <br>
            <span>${event.venue || ''}</span> <br>
            <span>${event.link ? `<a href='${event.link}' target='_blank'>Билеты</a>` : ''}</span> <br>
            <span>${event.description || ''}</span>
            <div class='event-actions'>
                <button class='btn' onclick='editEvent(${idx})'>Редактировать</button>
                <button class='btn' onclick='deleteEvent(${idx})'>Удалить</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function editEvent(idx) {
    const events = await getEvents();
    const event = events[idx];
    document.getElementById('eventId').value = idx;
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDate').value = event.date;
    document.getElementById('eventTime').value = event.time || '';
    document.getElementById('eventVenue').value = event.venue || '';
    document.getElementById('eventLink').value = event.link || '';
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('saveBtn').textContent = 'Обновить';
}

async function deleteEvent(idx) {
    const events = await getEvents();
    events.splice(idx, 1);
    await saveEvents(events);
    await renderEvents();
    resetForm();
}

function resetForm() {
    document.getElementById('eventId').value = '';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDate').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventVenue').value = '';
    document.getElementById('eventLink').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('saveBtn').textContent = 'Сохранить';
}

document.getElementById('eventForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const idx = document.getElementById('eventId').value;
    const event = {
        title: document.getElementById('eventTitle').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        venue: document.getElementById('eventVenue').value,
        link: document.getElementById('eventLink').value,
        description: document.getElementById('eventDescription').value
    };
    const events = await getEvents();
    if (idx) {
        events[idx] = event;
    } else {
        events.push(event);
    }
    await saveEvents(events);
    await renderEvents();
    resetForm();
});

document.getElementById('resetBtn').addEventListener('click', resetForm);

window.onload = renderEvents;
