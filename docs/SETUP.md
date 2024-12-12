# Gulp Web Client Setup Documentation

There are three options for setting up the Gulp web client depending on your needs:
	Production version,
	Development version, 
	Deploying a downloadable build on your server.

## 1. Production Version

To set up the production version of `gulpui-web`, follow these steps:
### Requirements:
- **Git**
- **Node.js** version > 20.15.0
- **npm** version > 10.7.0

### Installation:
1. Open a terminal and run the following commands:
    ```sh
    git clone https://<your-repository-url>/
    cd gulpui-web
    npm ci
    npm run build
    ```

2. Once the build completes successfully, navigate to the `/build` directory and launch a local server. You can use `LiveServer` or any other static file server.

3. Open `http://localhost:3000` in your browser to access the production build.

---

## 2. Development Version

For development, you can run `gulpui-web` in watch mode, which automatically reloads after any code changes.

### Requirements:
- **Git**
- **Node.js** version > 20.15.0
- **npm** version > 10.7.0

### Installation:
1. Open a terminal and run the following commands:
    ```sh
    git clone https://<your-repository-url>/
    cd gulpui-web
    npm install
    npm start
    ```

2. When you modify any files in the `/src` directory, the `gulpui-web` will automatically reload to reflect changes.

---

## 3. Downloadable Build for Deployment on Your Own Server

To deploy `gulpui-web` on your server, follow these steps:

### Steps:
1. Visit the official [Gulp Web Client GitHub repository](https://github.com/mentat-is/gulpui-web).
2. Navigate to the **Releases** tab.
3. Download the latest stable version as a zip file.
4. Extract the zip file to a location of your choice.
5. Copy the files from the extracted folder into the `htdocs` (or equivalent) folder on your web server.
