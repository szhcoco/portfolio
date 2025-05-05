import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// read the csv file:
async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        // copy all original csv fields into the returned data
        ...row,

        // convert data types
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.data + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    
    
    return data;
}

// group the data by d.commit



function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/YOUR_REPO/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,

                // time as a decimal 
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            // add lines array as a hidden property
            Object.defineProperty(ret, 'lines', {
                value: lines,
                configurable: true,
                writable: true,
                enumerable: false,
            })

            return ret;
        });
}

let data = await loadData();
let commits = processCommits(data);
console.log(commits);