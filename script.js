document.addEventListener('DOMContentLoaded', function () {
    const partSelector = document.getElementById('part-selector');
    const topicSelector = document.getElementById('topic-selector');
    const generateButton = document.getElementById('generate-button');
    const container = document.getElementById('question-container');

    const GENERATE_URL = '/api/generate_question';
    const TOPICS_URL = '/api/topics';

    /* ---------- small DOM helpers ----------
     * Everything below builds nodes and assigns textContent. Model output is
     * never passed through innerHTML: the API returns free text that happens
     * to be exam questions today, and an apostrophe or an angle bracket in it
     * should render as a character, not as markup.
     */

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function list(tag, className, items) {
        const node = el(tag, className);
        items.forEach(function (item) {
            node.appendChild(el('li', null, item));
        });
        return node;
    }

    function show(node) {
        container.replaceChildren(node);
    }

    function showMessage(className, text) {
        show(el('p', className, text));
    }

    /* ---------- topic picker ---------- */

    // The catalogue is owned by the API, so the picker is built from it rather
    // than hard-coded here. A failure is not fatal — "Surprise me" still works,
    // and the server picks a topic at random when none is sent.
    fetch(TOPICS_URL)
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            (data.topics || []).forEach(function (topic) {
                const option = el('option', null, topic.label);
                option.value = topic.id;
                topicSelector.appendChild(option);
            });
        })
        .catch(function (error) {
            console.warn('Could not load the topic list; staying on random.', error);
        });

    /* ---------- renderers, one per part shape ---------- */

    function renderHeader(data) {
        const meta = el('div', 'result-meta');
        meta.appendChild(el('span', 'badge', data.partLabel || ''));
        meta.appendChild(el('h2', 'result-title', data.topicLabel || ''));
        meta.appendChild(el('span', 'result-topic', data.topic || ''));
        return meta;
    }

    function renderQuestionSet(data) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(renderHeader(data));
        fragment.appendChild(list('ol', 'questions', data.questions || []));
        return fragment;
    }

    function renderCueCard(data) {
        const fragment = document.createDocumentFragment();
        fragment.appendChild(renderHeader(data));

        const card = el('div', 'cue-card');
        card.appendChild(el('p', 'task', data.task || ''));
        card.appendChild(el('p', 'say-label', 'You should say:'));
        card.appendChild(list('ul', null, data.bullets || []));
        card.appendChild(el('p', 'explain', data.explainPrompt || ''));
        card.appendChild(el(
            'p',
            'timing',
            'You have one minute to prepare. Then speak for one to two minutes.',
        ));
        fragment.appendChild(card);

        if ((data.followUps || []).length) {
            fragment.appendChild(el('p', 'section-label', 'Examiner follow-ups'));
            fragment.appendChild(list('ol', 'questions', data.followUps));
        }

        return fragment;
    }

    const RENDERERS = {
        part1: renderQuestionSet,
        part2: renderCueCard,
        part3: renderQuestionSet,
    };

    /* ---------- request ---------- */

    function generate() {
        const part = partSelector.value;
        const topic = topicSelector.value;

        generateButton.disabled = true;
        showMessage('loading', 'Generating…');

        fetch(GENERATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // An empty topic is omitted so the server draws one at random.
            body: JSON.stringify(topic ? { part: part, topic: topic } : { part: part }),
        })
            .then(function (response) {
                // Errors come back as JSON with a human-readable `error`, so
                // read the body either way instead of only on success.
                return response.json().then(function (body) {
                    if (!response.ok) {
                        throw new Error(body.error || 'HTTP ' + response.status);
                    }
                    return body;
                });
            })
            .then(function (data) {
                const render = RENDERERS[data.part];
                if (!render) {
                    throw new Error('Unexpected part in response: ' + data.part);
                }
                show(render(data));
            })
            .catch(function (error) {
                console.error('Generation failed:', error);
                showMessage('error', error.message);
            })
            .finally(function () {
                generateButton.disabled = false;
            });
    }

    generateButton.addEventListener('click', generate);
});
