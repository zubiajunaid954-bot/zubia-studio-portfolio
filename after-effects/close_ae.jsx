// Closes After Effects (the project is saved by the build script).
app.beginSuppressDialogs();
if (app.project) { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); }
app.quit();
