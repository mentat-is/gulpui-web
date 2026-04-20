## End-point:

## Create

- PUT `/create_kb`:
  - name: the title of kn
  - description: the text of kb
  - is_folder: boolean used to identify wich kb is folder
  - parent_id: the id of the parent folder
  - attachments: array oj json object used by UI to identify spefic attachment. backend not use or manipulate this fields.
  - tags: a list of string
  - glyph_id,
  - private: boolean used like notes or other collab items

Example kb entry create:

Url:
http://localhost:8080/create_kb?name=kb%20test&glyph_id=glyph_id&private=false&req_id=req_id
Body:

```json
{
	"is_folder": false,
	"parent_id": "string",
	"attachments": [
		{ "type": "stored_query", "id": 1234, "title": "my_queries" }
	],
	"description": "# Descritpion \nthis is a description in md format",
	"tags": ["one tags", "two tags"]
}
```

This example explain how to create a single entry in knowledge_base SQL table, all kb entry must to be located inside a folder (parent_id valorized), only entry folder type should have parent_id null (located in "root" folder).
This "file system" is not real, is an abstraction and allow us to avoid:

- path traversal issue
- access to file (slow performance)
- user file permission

Example folder create
Url:
http://localhost:8080/create_kb?name=foldert&glyph_id=glyph_id&private=false&req_id=req_id
Body:

```json
{
  "is_folder": true,
  "parent_id": null or "string",
}
```

Folder should haven't any other type of information, but is a collab item and can have glyph, tags, description like each other (if need for UI you can set).

Example response folder:

```json
{
  'is_folder': True,
  'id': 'abb8605e-c123-4c77-aa0d-4876dfc04b4b',
  'type': 'knowledge_base',
  'user_id': 'admin',
  'name': 'docs',
  'time_created': 1763726884978,
  'time_updated': 1763726884978,
  'tags': [],
  'granted_user_ids': [],
  'granted_user_group_ids': []}
```

Example response item "file":

````json
{
'is_folder': False,
'parent_id': '07d41b67-a9bd-4c78-b2b1-6a9f743fc402',
'id': '017f0b4b-0959-47b4-84a5-734de71f3add',
'type': 'knowledge_base',
'user_id': 'admin',
'name': 'regex.py.md',
'time_created': 1763726885158,
'time_updated': 1763726885158,
'description': '# regex.py\n\n## Overview\n\nThe [regex plugin](../../src/gulp/plugins/regex.py) is designed to process text files using regular expressions with named capture groups. It analyzes files line by line, applying a specified regex pattern and extracting matched groups into structured `GulpDocument` objects.\n\n> **NOTE**: The plugin requires a \'timestamp\' named group in your regex pattern as each document must have a "@timestamp" field.\n\n## Regular Expression Format Brief\n\nRegular expressions (regex) are powerful pattern-matching tools used to identify and extract specific text patterns. In this plugin:\n\n- Named capture groups (`(?P<name>pattern)`) are used to extract and label data\n- Each line of the input file is matched against the provided regex pattern\n- Only successfully matched lines are processed into documents\n- The plugin requires at least one named capture group called `timestamp`\n- Non-matching lines are logged as warnings and counted as failed records\n\n## Standalone Mode\n\nThe regex plugin is primarily designed to be used in standalone mode, applying regex patterns directly to input files.\n\n### Parameters\n\nThe regex plugin supports the following custom parameters in the `custom_parameters` dictionary:\n\n- `encoding`: Specifies the character encoding to use when opening the file (default=None, which typically falls back to system default)\n- `date_format`: Format string to parse the timestamp field; if null, tries autoparse (default=None)\n- `regex`: The regular expression pattern to apply to each line (must use named groups)\n- `flags`: Integer representing regex compilation flags (default=0)\n  - Example flags: 2 (`re.IGNORECASE`), 8 (`re.MULTILINE`), 16 (`re.DOTALL`)\n\nAdditional parameters can be specified in the `mapping_parameters` dictionary:\n\n- `mappings`: Dictionary of field mappings to apply\n- `mapping_file`: Path to the JSON file containing the mapping\n- `mapping_id`: Identifier of the mapping to use from the mapping file\n\n## Stacked Mode\n\nIn stacked mode, the stacked plugin runs the `regex` plugin first which sequentially calls the stacked plugin\'s `record_to_gulp_document` function.\nThis is useful to avoid re-writing the regex processing logic, and focus on the parsing of the data instead.\nOther common use cases for using regex as a stacked plugin include:\n\n- The stacked plugin requires specific configuration parameters\n- Files need preprocessing before regex parsing (e.g., line filtering, character replacement)\n- Custom post-processing of regex-matched data is required\n\n## Example Usage\nHere\'s an example of testing the plugin using the `test_scripts/ingest.py` script:\n\n```bash\npython test_scripts/ingest.py \\\n  --plugin regex \\\n  --path samples/logfile.txt \\\n  --plugin_params \'{\n    "custom_parameters":{\n      "regex":"(?P<timestamp>\\\\d{4}-\\\\d{2}-\\\\d{2} \\\\d{2}:\\\\d{2}:\\\\d{2}) (?P<level>\\\\w+) (?P<message>.*)",\n      "flags":0\n    }\'\n```\n\n## GulpDocument\n\nHere\'s an example of a document generated by this plugin using the defaults:\n\n```json\n\n```\n\nFields:\n- ...\n\n## Available Mappings\n\nThe following are the default mappings shipping with gulp which support this plugin: \n\n- ...\n\n## Common Issues and Solutions\n\n- **No matches found**: Make sure your regex pattern correctly matches the format of your file lines\n- **Missing timestamp**: Ensure your regex includes a named group called \'timestamp\'\n- **Timestamp parsing errors**: Ensure timestamp is in a format recognized by gulp, if not make a stacked plugin to convert the time format\n- **Performance issues**: Overly complex regex patterns may slow down processing for large files\n\n## Regular Expression Tips\n\n- Test your regex pattern with a tool like [regex101.com](https://regex101.com/) before using it\n- Use non-capturing groups `(?:pattern)` for groups you don\'t need to extract\n- Remember to escape backslashes in JSON configuration (e.g., `\\\\d` instead of `\\d`)\n- Use appropriate flags for case sensitivity, multiline matching, etc.', 'tags': [], 'granted_user_ids': [], 'granted_user_group_ids': []}
````

## Update

- POST `update_kb`:
  - obj_id: the kb id that we want update
  - name: the new name of kb
  - tags: the new list of tags
  - description: the new description
  - glyph_id: the new glyph
  - attachments: the new list of attachments

Example update:

Url:
http://localhost:8080/update_kb?obj_id=obj_id&name=kb%20test&glyph_id=glyph_id&req_id=req_id
Body:

```json
{
	"attachments": [
		{ "type": "stored_query", "id": 1234, "title": "my_queries" }
	],
	"description": "# Descritpion \nthis is a description in md format",
	"tags": ["one tags", "two tags"]
}
```

Cannot change type of kb: from folder to "file" or viceversa
Cannot change folder: there are a specific api to call to move file or entire folder from other folder

## MOVE

- POST `move_kb` - obj_id: the folder we want move - parent_id: the new location - req_id
  Example Move:

Url:
http://localhost:8080/update_kb?obj_id=obj_id&parent_id=abcdf&req_id=req_id

Move the object `obj_id` in folder `parent_id`, obj_id can identify folder or "file", but `parent_id` must to be indentify a folder or null (root folder):
Check execute by server:

- cannot move file into file
- cannot move file into root
- cannot move file/folder without EDIT permission

## DELETE

- DELETE `delete_kb`
  - obj_id: the kb id to be deleted

Example delete
http://localhost:8080/delete_kb?obj_id=obj_id

Delete from db the id provided,

Add a new check to avoid **deleting the** folder if there are any items inside it. If **the** provided obj_id is a folder, **verify that it is empty**. If there are no items, Gulp removes **the** folder; otherwise, **it returns an** error.

## GET BY ID:

- GET `get_kb_by_id`:
  - obj_id: the kb id

return the kb entry by id provided (see create response)

## GET LIST:

- POST `get_kb_list`:
  - flt: GulpCollabFilter object like other gulp search (stored_query for example and more)
  - show_tree: bool, reduce result information with only info to create a "file explorer tree"

Like other search inside GULP, flt and show_tree must to be provided via BODY, if show tree is false, all data are returned like create response example.
Else if show_tree is set true, only minimal information are returned:

```json
[
 {
   "id": kb["id"],
   "name": kb["name"],
   "is_folder": kb["is_folder"],
   "parent_id": kb.get("parent_id", None),
   "glyph_id": kb.get("glyph_id", None),
  }
]
```

This allow UI to render a file explorer tree without receive a lot or information (tags, description, attachment ecc...) in a single request.

TBD: Evaluate if you want glyph also and i add in response.

## UPLOAD BY FILE:

- POST `upload_kb_file`: - ws_id - name - req_id - glyph_id - private - parent_id - tags - attachments
  LIke `query_sigma_zip` this end_point receive a file via form-data and create a single kb file entityt in collab DB

Example:
url: http://localhost:8080/upload_kb_file?name=kb%20test&glyph_id=glyph_id&private=false&req_id=req_id&ws_id=ws_id
Body:

```json
{
	"payload": ("payload.json",
	{
	  "parent_id": "string",
	  "attachments": [{"type":"stored_query","id":1234,"title":"my_queries"}],
	  "tags": [
	    "one tags", "two tags"
	  ]
	}, "application/json"),
	"f": ("filename.ext",file,"application/octet-stream")
}
```

The response will sended via "ws" with `collab_create` type

To avoid Security issue ("XSS", upload not text file ecc..), gulp check if file is a real text file (not binary file like exe, img, ...) and execute a html escape to avoid xss stored issue.
For example html.escape convert:

- `&` -> `&amp;`
- `<` -> `&lt;`
- `>` -> `&gt;`
- `"` -> `&quot;`
- `'` -> `&#x27;`
