const core = require('@actions/core');
const https = require('https');
const fetch = require('node-fetch');

const main = async () => {
    try {
        /**
         * We need to fetch all the inputs that were provided to our action
         * and store them in variables for us to use.
         **/
        const content_id = core.getInput('content_id', { required: true });
        const space_key = core.getInput('space_key', { required: true });
        const confluence_username = core.getInput('confluence_username', { required: true });
        const confluence_api_key = core.getInput('confluence_api_key', { required: true });
        const confluence_base_url = core.getInput('confluence_base_url', { required: true });
        const html_content = core.getInput('html_content', { required: true });
        const max_versions = core.getInput('max_versions', { required: true});

        auth = Buffer.from(`${confluence_username}:${confluence_api_key}`).toString('base64')

        await updatePage(auth, space_key, content_id, confluence_base_url, html_content, max_versions);

    } catch (error) {
        core.setFailed(error.message);
    }
}

const trimVersions = async (auth, space_key, content_id, confluence_base_url, max_versions, currentVersion) => {
    console.log('Trimming Versions...');

    url = `${confluence_base_url}/wiki/rest/api/content/${content_id}`;

    if (currentVersion < max_versions) {
        console.log('Current version is less than max versions.');
        return;
    }

    versionsToDelete = currentVersion - max_versions - 1;

    console.log(`Will delete ${versionsToDelete} versions.`);

    while (versionsToDelete > 0) {
        url = `${confluence_base_url}/wiki/rest/api/content/${content_id}/version/1`;
        
        console.log(`Invoking: ${url}`);

        response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `Basic ${auth}`
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            })
        });

        if (!response.ok) {
            console.log(await response.json());
        }

        versionsToDelete--;
    }
}

const getCurrentPage = async (auth, space_key, content_id, confluence_base_url) => {
    try {
        console.log("Getting page details");

        url = `${confluence_base_url}/wiki/rest/api/content/${content_id}`;

        var response = await fetch(url, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });

        var details = await response.json();

        return details;

    } catch (error) {
        core.setFailed(error.message);
    }
}

const updatePage = async (auth, space_key, content_id, confluence_base_url, html_content, max_versions) => {
    try {
        pageDetails = await getCurrentPage(auth, space_key, content_id, confluence_base_url);

        console.log('Updating content');

        currentVersion = pageDetails.version.number;

        console.log(`Current version: ${currentVersion}`);

        data = {
            id: content_id,
            type: 'page',
            title: pageDetails.title,
            space: { key: space_key },
            body: {
                storage: {
                    value: html_content,
                    representation: 'storage',
                },
            },
            version: {
                number: currentVersion + 1
            }
        };

        url = `${confluence_base_url}/wiki/rest/api/content/${content_id}`;
        
        response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
            body: JSON.stringify(data),
        });

        if (response.ok) {
            await trimVersions(auth, space_key, content_id, confluence_base_url, max_versions, currentVersion);
        }

        console.log(await response.json());
    }
    catch (error) {
        core.setFailed(error.message);
    }

};

// Call the main function to run the action
main();