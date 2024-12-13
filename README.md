
# Introduction

Gulp ui web это браузерное приложение которое используется для анализа и взаимодейсвия с бекенд частью гульпа, написанное на базе React и shadcn/ui библиотек
Документация:
1. Разворачивание приложения 
2. Минимальные требования

# Workflow
## Authorization

#### Этап номер 1: Авторизация
Войдите в приложение как это описано [здесь][./docs/setup.md]. В веб-интерфейсе появится окно авторизации при помощи имени пользователя, пароля, и ссылки на сервер gulp как это изображено на рисунке №1

| ![[./docs/login-page.png]] |
| :-----------------: |
|    *Picture №1*     |

#### Select operation
После успешной авторизации отобразится окно выбора operation, как изображено на рисунке №2

| ![[./docs/operation-chooser.png]] |
| :-----------------: |
|    *Picture №2*    |

#### Select files
Третий этап входа в систему: Выбор контекстов (групп), плагинов (категорий), и файлов (документов) к отображению. В последующем выбор можно изменить через [меню приложения](#application-menu). Кнопка "Upload and analyze" позволяет открыть [Ingest file](./docs/banners/INGEST_FILE) баннер (ingestion) [файлов](./docs/DEFINITIONS.md#file). Также доступна возможность выбора всего контекста, плагинов, или файлов по отдельности. Предоставляется возможность выбора всех данных при нажатии на Select all как это изображено на рисунке №3

| ![[./docs/select-files.png]] |
| :-------------------: |
|     *Picture №3*      |

#### Set visibility range
При помощи предоставленного интерфейса можно изменить временные рамки для отображения данных на [Timeline](#timeline).
Доступные опции:
1. Последний день с момента последнего лога
2. Последняя неделя с момента последнего лога
3. Последний месяц с момента последнего лога
4. Весь период
Предоставлена возможность более точной настройки выбора временного промежутка, при помощи переключения в режим "ISO String", о котором можно подробнее почитать [здесь](https://en.wikipedia.org/wiki/ISO_8601).

| ![[./docs/range.png]] |
| :-------------------: |
|     *Picture №4*      |


#### Timeline
The timeline visualization represents a structured view of system log data over a defined period. Each horizontal row corresponds to a specific log file or data source, showcasing its activity through color-coded bars and graphical overlays. This tool facilitates the analysis of system events, correlations, and trends across multiple data streams.
###### Components

1. **Time Scale**
- Located at the top of the visualization, the time scale divides the timeline into intervals (e.g., 10-day spans in this example).
- Allows precise navigation and identification of event occurrences within the selected period.

2. **Rows and Data Sources**
- Each horizontal row corresponds to a specific log file (e.g., `Security.evtx`, `System.evtx`).
- The log file name and its unique identifier are displayed on the left side of the row.

**Example Rows:**
- `Microsoft-Windows-Ntfs%4Operational.evtx` logs file system operations.
- `Security.evtx` records security-related events.

3. **Color-Coded Activity**
- **Yellow Bars:** Indicate significant or high-intensity activity.
- **Purple Bars:** Represent less intensive or background processes.

This differentiation highlights priority areas for investigation.

4. **Graphical Overlays**
- Lines with nodes and numerical labels represent quantitative metrics (e.g., event counts, errors).
- Peaks and valleys in the graph highlight activity fluctuations over time.

**Example:** A peak labeled `2625` in `Microsoft-Windows-Ntfs%4Operational.evtx` indicates a high volume of events at that moment.

5. **Event Markers**
- Icons (e.g., settings, cryptocurrency, book symbols) pinpoint specific types of events or milestones.
- Custom markers can be used to denote key system states or anomalies.

**Example:** A marker at `2024/07/18` aligns peaks in `System.evtx` and `Microsoft-Windows-SMBServer%4Operational.evtx`.

###### Use Cases
- **Anomaly Detection:** Identify unusual spikes or dips in activity (e.g., a sudden surge in security events).
- **Correlation Analysis:** Explore relationships between simultaneous events across different logs.
- **Performance Monitoring:** Track recurring patterns or trends to optimize system performance.

###### Example Interpretation
1. **High Activity Periods:**
   - `Security.evtx` shows intense yellow bars in early August 2024, indicating a possible security incident.

2. **Co-occurring Events:**
   - A vertical marker highlights synchronized activities between `Microsoft-Windows-Hyper-V-Switch-Operational.evtx` and `System.evtx`.

3. **Specific Metrics:**
   - In `Microsoft-Windows-Ntfs%4Operational.evtx`, consistent peaks suggest periodic file system operations.

| ![[./docs/timeline.png]] |
| :---------------: |
|   *Picture №4*    |

#### Menu
Меню приложения которое можно вызывается при нажатии на кнопку "Menu" которая находится в верхней части приложения, как изображено на рисунке №5

| ![[./docs/menu-button.png]] |
| :---------------: |
|   *Picture №5*    |

После нажатия открывается соответствующий интерфейс с настройками, который изображён на рисунке 6.
Основные опции:
1. [Upload files](#Ingest-files)
2. Загрузить sigma-rule
3. [Select Files](#Select-files)
4. Open notes window
5. [Change visible limits](#Set-visibility-range)
6. Query external sourse
7. Export canvas as image

Отладночная информация:
1. Кол-во переданных данных с начала сессии
2. Кол-во полученных данных с начала сессии

Дополнительные опции:
1. [Back to Operations](#Select-operation)
2. Logout

| ![[./docs/menu.png]] |
| :-----------: |
| *Picture №6*  |

#### Ingest files
Интерфейс предназначенный для загрузки файлов на бекенд gulp с целью их дальнейшего анализа.

Вверху интерфейса находится кнопка для вызова диалогового окна выбора файла/файлов для загрузки. 
Ниже находится переключатель, который позволяет создать новый [контекст](./docs/DEFINITIONS#context), или, если его включить, будет предоставлена возможность добавления файлов в уже существующий контекст

| ![[./docs/upload-files.png]] |
| :-----------: |
| *Picture №7*  |

Вот как выглядит зак

| ![[./docs/upload-files-fulfilled.png]] |
| :-----------: |
| *Picture №8*  |

### Accessing the Internal Logs
To access the internal logs of the application, you can open the command line interface (CLI) by pressing `/`. This will open a console with all the logs generated by the program, allowing you to inspect any issues or debug information.

### Exporting Logs for Bug Reporting
If you need to report a bug or an issue, you can export all the logs into a file that can be attached to a GitHub issue.

1. Press F8 to open the command line.
2. Type the command export and press Enter.
3. The logs will be saved into a file named gulpui-web_log_timestamp.log
4. This log file can be used when creating a new issue in GitHub, providing valuable context to help developers diagnose the problem.
It is recommended to include the exported logs in your GitHub issues to assist in quicker resolution of bugs.
