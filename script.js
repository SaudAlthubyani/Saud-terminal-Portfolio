// Initialize Terminal
        const term = new Terminal({
            cursorBlink: true,
            convertEol: true,
            cols: window.innerWidth < 1024 ? 50 : 80,
            rows: window.innerWidth < 1024 ? 30 : 24,
            scrollback: 1000,
            wrapOnWord: true,
            theme: { background: '#1e1e2f', foreground: '#c5c6c7' },
            disableStdin: false,
            fontSize: window.innerWidth < 1024 ? 11 : 14
        });
        term.open(document.getElementById('terminal'));

        // Browser state and CTF system
        let isBrowserVisible = false;
        let currentUrl = '';
        let foundFlags = new Set();
        let userPoints = 0;
        const totalFlags = 6;
        const pointsPerFlag = 100;

        // Secret flags for each vulnerable page
        const flags = {
            'vulnerable-login': 'FLAG{L0G1N_3XPL01T3D}',
            'admin-panel': 'FLAG{SC2IPT_1NJ3CT10N}',
            'file-upload': 'FLAG{D1R3CT0RY_TR4V3RS4L}',
            'api-endpoint': 'FLAG{4UTH_8YP4SS3D}',
            'database-interface': 'FLAG{D4T4_3XTR4CT3D}',
            'config-backup': 'FLAG{S3NS1T1V3_D4T4}'
        };

        // Explanations for each challenge
        const explanations = {
            'vulnerable-login': {
                vulnerability: "SQL Injection",
                explanation: "This challenge demonstrates SQL injection vulnerability in login forms. The application doesn't properly sanitize user input, allowing attackers to bypass authentication.",
                howItWorks: "By entering SQL injection payloads like ' OR '1'='1' -- in the username field, you can manipulate the SQL query to always return true, bypassing the password check.",
                prevention: "Use parameterized queries/prepared statements, input validation, and never trust user input directly in SQL queries.",
                tips: "Try common SQL injection payloads: ' OR 1=1 --, admin' --, ' OR 'a'='a"
            },
            'admin-panel': {
                vulnerability: "Cross-Site Scripting (XSS)",
                explanation: "This challenge shows Reflected XSS where user input is directly reflected in the page without proper encoding, allowing JavaScript execution.",
                howItWorks: "The search function doesn't properly encode special characters. When you input HTML/JavaScript, it gets executed in the browser context.",
                prevention: "Implement proper input validation, output encoding/escaping, Content Security Policy (CSP), and use frameworks that auto-escape by default.",
                tips: "Try XSS payloads like: &lt;img src=x onerror=flag()&gt;, &lt;svg onload=flag()&gt;, or &lt;script&gt;flag()&lt;/script&gt;"
            },
            'file-upload': {
                vulnerability: "Directory Traversal",
                explanation: "This vulnerability allows attackers to access files outside the intended directory by using '../' sequences to navigate the file system.",
                howItWorks: "The application doesn't properly validate file paths, allowing '../' sequences to traverse directories and access sensitive system files.",
                prevention: "Validate and sanitize file paths, use a whitelist of allowed files/directories, and implement proper access controls.",
                tips: "Try paths like: ../../../etc/passwd, ../../windows/system32/config, or combinations with directory traversal sequences"
            },
            'api-endpoint': {
                vulnerability: "Broken Access Control",
                explanation: "This shows how APIs might expose sensitive information when proper authorization checks are missing for different user roles.",
                howItWorks: "The API doesn't properly validate user permissions, allowing access to admin-level information by simply changing the user ID parameter.",
                prevention: "Implement proper authorization checks, use role-based access control (RBAC), and validate user permissions on every request.",
                tips: "Try different user IDs: admin, 0, root, administrator, or negative numbers"
            },
            'database-interface': {
                vulnerability: "Information Disclosure",
                explanation: "Applications sometimes expose sensitive information to unauthorized users due to improper access controls or overly permissive queries.",
                howItWorks: "The system reveals admin-level information including database credentials when accessing certain employee records.",
                prevention: "Implement proper role-based access controls, data filtering based on user permissions, and principle of least privilege.",
                tips: "Look for admin users, special IDs like 0 or 10, or try 'admin' as the employee ID"
            },
            'config-backup': {
                vulnerability: "Sensitive Data Exposure",
                explanation: "Backup files and configuration files often contain sensitive information like passwords, API keys, and flags that shouldn't be accessible.",
                howItWorks: "Configuration and backup files are stored in accessible locations without proper access controls, exposing sensitive data.",
                prevention: "Secure backup files with proper permissions, encrypt sensitive data, use environment variables for secrets, and regularly audit file permissions.",
                tips: "Look through backup files, especially .env files, configuration files, and database backups for sensitive information"
            }
        };

        // Terminal state
        let isTerminalVisible = true;
        let currentInput = "";
        let commandHistory = [];
        let historyIndex = 0;
        let cursorPosition = 0;
        let introFinished = false;

        // Dragging functionality
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        const username = "saud";
        const hostname = "portfolio";
        const prompt = () => `\x1B[32m${username}@${hostname}:~$\x1B[0m `;

        const sections = {
            about: [
                "Saud Ateeq Al-thubyani | Saudi Arabia",
                "Motivated Information Systems graduate with",
                "passion for cybersecurity.",
                "Experience: Communications Dept. Intern at",
                "Emirate of Yanbu Al-Bahr",
                "Education: BSc Information Systems",
                "Taibah University",
                "Languages: Arabic, English"
            ],
            projects: [
                "Graduation Project | Smart Entry/Exit System",
                "for Taibah University.",
                "• Developed web-based permit management system",
                "• Implemented role-based access control",
                "  (Admin, Employee, Security Guard)",
                "• Designed permit workflows",
                "  (request, review, approval)",
                "• Built admin dashboard for user management",
                "• Ensured data integrity through authentication",
                "• Technologies: HTML, CSS, JavaScript, PHP, MySQL",
                "• Tools: XAMPP, VS Code",
                "• Methodology: Waterfall SDLC"
            ],
            certifications: [
                "Junior Penetration Tester (eJPTV2)",
                "INE Certified Cloud Associate (ICCA)",
                "Web Application Penetration Tester (eWPTv2)"
            ],
            labs: [
                "TryHackMe – Pre-Security & Web Fundamentals",
                "Security Blue Team – Vulnerability Assessment",
                "CTF Writeups & Web Application Testing"
            ],
            skills: [
                "Penetration Testing & Web App Testing",
                "Vulnerability Assessment",
                "Network Security, Linux & Windows",
                "Cloud Fundamentals",
                "Tools: Burp Suite, Wireshark, Nessus,",
                "Metasploitable2",
                "Soft Skills: Problem Solving, Analytical",
                "Thinking, Teamwork"
            ],
            contact: [
                "Contact Information:",
                "LinkedIn:",
                "https://www.linkedin.com/in/saud-althubyani-0748b9312",
                "",
                "You can copy the link above or click the",
                "LinkedIn logo below the terminal!"
            ]
        };

        const commands = ["nmap", "connect", "help", "clear", "browser", "flags", "points", "scan", "decrypt", "sysinfo", "trace", "kali"];
        const ports = {
            22: "about",
            80: "projects", 
            8443: "certifications",
            3389: "labs",
            8080: "skills",
            21: "contact",
            6697: "tryhackme"  // Add new port for TryHackMe
        };
        let scanCompleted = false;
        let isKaliTheme = false;

        // DOM Elements
        const terminalContainer = document.getElementById('terminal-container');
        const terminalHeader = document.getElementById('terminal-header');
        const closeBtn = document.getElementById('close-btn');
        const minimizeBtn = document.getElementById('minimize-btn');
        const maximizeBtn = document.getElementById('maximize-btn');
        const terminalIcon = document.getElementById('terminal-icon');

        // Browser DOM Elements 
        let browserContainer, browserIcon, browserContent;

        // Initialize browser elements when DOM loads
        document.addEventListener('DOMContentLoaded', function() {
            createBrowserElements();
            
            // Add TryHackMe icon click handler
            const thmIcon = document.getElementById('thm-icon');
            thmIcon.addEventListener('click', () => {
                window.open('https://tryhackme.com/p/blackoutx8', '_blank');
            });
        });

        // Create browser window and icon
        function createBrowserElements() {
            // Create browser icon in taskbar
            browserIcon = document.createElement('div');
            browserIcon.className = 'taskbar-icon';
            browserIcon.id = 'browser-icon';
            browserIcon.title = 'Browser';
            browserIcon.innerHTML = '<img src="https://www.mozilla.org/media/protocol/img/logos/firefox/browser/logo-lg.3d9087ac44e8.png" alt="Browser" style="width: 24px; height: 24px;">';

            // Insert browser icon before terminal icon
            const taskbarIcons = document.querySelector('.taskbar-icons');
            taskbarIcons.insertBefore(browserIcon, terminalIcon);

            // Create browser window
            browserContainer = document.createElement('div');
            browserContainer.className = 'terminal-container hidden';
            browserContainer.id = 'browser-container';

            // Browser header
            const browserHeader = document.createElement('div');
            browserHeader.className = 'terminal-header';
            browserHeader.innerHTML = `
                <div class="buttons">
                    <span class="close" id="browser-close-btn" title="Close"></span>
                    <span class="minimize" id="browser-minimize-btn" title="Minimize"></span>
                    <span class="maximize" id="browser-maximize-btn" title="Maximize"></span>
                </div>
                <div class="title">SecLab Browser - Find the flags!</div>
            `;

            // Browser content area
            browserContent = document.createElement('div');
            browserContent.id = 'browser-content';
            browserContent.className = 'browser-content';
            browserContent.style.cssText = `
                flex-grow: 1;
                padding: 20px;
                overflow-y: auto;
                color: #c5c6c7;
                background: #1a1b26;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
            `;

            browserContainer.appendChild(browserHeader);
            browserContainer.appendChild(browserContent);
            document.body.appendChild(browserContainer);

            // Event listeners
            browserIcon.addEventListener('click', toggleBrowser);
            
            document.getElementById('browser-close-btn').addEventListener('click', hideBrowser);
            document.getElementById('browser-minimize-btn').addEventListener('click', hideBrowser);
            document.getElementById('browser-maximize-btn').addEventListener('click', toggleBrowserMaximize);

            // Dragging for browser
            browserHeader.addEventListener('mousedown', startBrowserDrag);
        }

        // Browser functionality
        function toggleBrowser() {
            if (isBrowserVisible) {
                hideBrowser();
            } else {
                showBrowser();
            }
        }

        function showBrowser() {
            browserContainer.classList.remove('hidden');
            browserIcon.classList.add('active');
            isBrowserVisible = true;
            loadVulnerableSite();
        }

        function hideBrowser() {
            browserContainer.classList.add('hidden');
            browserIcon.classList.remove('active');
            isBrowserVisible = false;
        }

        function toggleBrowserMaximize() {
            browserContainer.classList.toggle('maximized');
        }

        // Browser dragging
        function startBrowserDrag(e) {
            if (e.target.className.includes('close') || e.target.className.includes('minimize') || e.target.className.includes('maximize')) return;
            
            isDragging = true;
            const rect = browserContainer.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            document.addEventListener('mousemove', handleBrowserDrag);
            document.addEventListener('mouseup', stopBrowserDrag);
            e.preventDefault();
        }

        function handleBrowserDrag(e) {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffsetX;
            const y = e.clientY - dragOffsetY;
            
            const maxX = window.innerWidth - browserContainer.offsetWidth;
            const maxY = window.innerHeight - browserContainer.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(x, maxX));
            const constrainedY = Math.max(35, Math.min(y, maxY));
            
            browserContainer.style.left = `${constrainedX}px`;
            browserContainer.style.top = `${constrainedY}px`;
            browserContainer.style.transform = 'none';
        }

        function stopBrowserDrag() {
            isDragging = false;
            document.removeEventListener('mousemove', handleBrowserDrag);
            document.removeEventListener('mouseup', stopBrowserDrag);
        }

        // Load vulnerable website content
        function loadVulnerableSite() {
            const mainPage = `
                <div style="max-width: 900px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #00bfff; text-align: center; margin-bottom: 30px; font-size: 2.5em; text-shadow: 0 0 10px rgba(0,191,255,0.3);">
                        SecLab Challenges
                    </h1>
                    
                    <div style="background: rgba(45, 55, 72, 0.7); padding: 20px; border-radius: 12px; margin-bottom: 30px; backdrop-filter: blur(10px); border: 1px solid rgba(66, 153, 225, 0.3); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h3 style="color: #00bfff; margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">🏆</span> Your Progress
                        </h3>
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                            <div>
                                <p style="font-size: 1.1em; margin: 5px 0;">Flags Found: <span style="color: #48bb78; font-weight: bold;">${foundFlags.size}/${totalFlags}</span></p>
                                <p style="font-size: 1.1em; margin: 5px 0;">Points: <span style="color: #00bfff; font-weight: bold;">${userPoints}/${totalFlags * pointsPerFlag}</span></p>
                            </div>
                            <div style="flex-grow: 1; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden;">
                                <div style="width: ${(foundFlags.size/totalFlags)*100}%; height: 100%; background: linear-gradient(90deg, #48bb78, #00bfff); transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                        ${foundFlags.size === totalFlags ? '<p style="color: #ffd700; font-weight: bold; text-align: center; margin-top: 15px; font-size: 1.2em;"> CONGRATULATIONS! You found all flags! </p>' : ''}
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 20px 0;">
                        <div onclick="loadPage('vulnerable-login')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> Login Portal
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">SQL Injection Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('vulnerable-login') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('vulnerable-login') ? ' Completed' : 'Unsolved'}
                                </span>
                            </div>
                        </div>

                        <div onclick="loadPage('admin-panel')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> Admin Panel
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">XSS Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('admin-panel') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('admin-panel') ? ' Completed' : 'Unsolved'}
                                </span>
                            </div>
                        </div>

                        <div onclick="loadPage('file-upload')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> File Manager
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">Directory Traversal Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('file-upload') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('file-upload') ? ' Completed' : ' Unsolved'}
                                </span>
                            </div>
                        </div>

                        <div onclick="loadPage('api-endpoint')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> API Endpoint
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">Access Control Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('api-endpoint') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('api-endpoint') ? 'Completed' : ' Unsolved'}
                                </span>
                            </div>
                        </div>

                        <div onclick="loadPage('database-interface')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> Employee Portal
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">Information Disclosure Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('database-interface') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('database-interface') ? ' Completed' : ' Unsolved'}
                                </span>
                            </div>
                        </div>

                        <div onclick="loadPage('config-backup')" class="challenge-card" style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease; backdrop-filter: blur(10px);">
                            <h4 style="color: #00bfff; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 20px;"></span> Config Files
                            </h4>
                            <p style="color: #a0aec0; margin: 0 0 10px 0;">Sensitive Data Exposure Challenge</p>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #f56565; font-weight: bold;">100 pts</span>
                                <span style="color: ${foundFlags.has('config-backup') ? '#48bb78' : '#a0aec0'};">
                                    ${foundFlags.has('config-backup') ? ' Completed' : ' Unsolved'}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            `;
            
            browserContent.innerHTML = mainPage;

            // Add hover effects to challenge cards
            const cards = document.querySelectorAll('.challenge-card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px)';
                    card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
                    card.style.borderColor = '#00bfff';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = 'none';
                    card.style.borderColor = 'rgba(255,255,255,0.1)';
                });
            });
        }

        // Flag submission system
        function submitFlag(challengeId, inputId) {
            const userFlag = document.getElementById(inputId).value.trim();
            const correctFlag = flags[challengeId];
            const resultDiv = document.getElementById(`${inputId}-result`);
            
            if (userFlag === correctFlag) {
                if (!foundFlags.has(challengeId)) {
                    foundFlags.add(challengeId);
                    userPoints += pointsPerFlag;
                    resultDiv.innerHTML = `
                        <div class="success-result">
                            <strong>Correct! +${pointsPerFlag} points</strong><br>
                            Flag accepted: <code>${correctFlag}</code>
                        </div>
                    `;
                    // Show explanation after successful flag submission
                    showExplanation(challengeId);
                } else {
                    resultDiv.innerHTML = `
                        <div class="success-result">
                            Flag already submitted!
                        </div>
                    `;
                }
            } else if (userFlag === '') {
                resultDiv.innerHTML = `
                    <div class="error-result">
                        Please enter a flag
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="error-result">
                        Incorrect flag. Try again!
                    </div>
                `;
            }
        }

        // Show explanation after flag submission
        function showExplanation(challengeId) {
            const explanation = explanations[challengeId];
            const explanationDiv = document.getElementById(`${challengeId}-explanation`);
            
            explanationDiv.innerHTML = `
                <div style="background: rgba(30, 41, 59, 0.7); padding: 20px; border-radius: 12px; margin-top: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(0,191,255,0.3);">
                    <h4 style="color: #00bfff; margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">🎯</span> ${explanation.vulnerability}
                    </h4>
                    <div style="display: grid; gap: 15px;">
                        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                            <h5 style="color: #00bfff; margin: 0 0 8px 0;">What Happened:</h5>
                            <p style="margin: 0; color: #c5c6c7;">${explanation.explanation}</p>
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                            <h5 style="color: #00bfff; margin: 0 0 8px 0;">How it Works:</h5>
                            <p style="margin: 0; color: #c5c6c7;">${explanation.howItWorks}</p>
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
                            <h5 style="color: #00bfff; margin: 0 0 8px 0;">Prevention:</h5>
                            <p style="margin: 0; color: #c5c6c7;">${explanation.prevention}</p>
                        </div>
                        <div style="background: rgba(72, 187, 120, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(72, 187, 120, 0.3);">
                            <h5 style="color: #48bb78; margin: 0 0 8px 0;">💡 Tips for Similar Challenges:</h5>
                            <p style="margin: 0; color: #c5c6c7;">${explanation.tips}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Load specific vulnerable pages
        function loadPage(pageId) {
            const commonStyles = `
                <style>
                    .challenge-container {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .challenge-header {
                        color: #00bfff;
                        text-align: center;
                        margin-bottom: 30px;
                        font-size: 2em;
                        text-shadow: 0 0 10px rgba(0,191,255,0.3);
                    }
                    .challenge-box {
                        background: rgba(30, 41, 59, 0.7);
                        padding: 25px;
                        border-radius: 12px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.1);
                        margin-bottom: 20px;
                    }
                    .input-field {
                        width: 100%;
                        padding: 12px;
                        margin: 10px 0;
                        background: rgba(0,0,0,0.2);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 6px;
                        color: #c5c6c7;
                        font-size: 14px;
                    }
                    .input-field:focus {
                        outline: none;
                        border-color: #00bfff;
                    }
                    .button {
                        background: #00bfff;
                        color: white;
                        padding: 12px 24px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.3s ease;
                    }
                    .button:hover {
                        background: #0099cc;
                        transform: translateY(-2px);
                    }
                    .result-box {
                        margin-top: 20px;
                        padding: 15px;
                        border-radius: 6px;
                        background: rgba(0,0,0,0.2);
                    }
                    .back-button {
                        background: rgba(255,255,255,0.1);
                        color: #c5c6c7;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-top: 20px;
                        transition: all 0.3s ease;
                    }
                    .back-button:hover {
                        background: rgba(255,255,255,0.2);
                    }
                </style>
            `;

            let pageContent = '';
            
            switch(pageId) {
                case 'vulnerable-login':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">User Login Challenge</h2>
                            <div class="challenge-box">
                                <form onsubmit="checkLogin(event)">
                                    <div class="form-group">
                                        <label>Username:</label>
                                        <input type="text" id="username" placeholder="Enter username" class="input-field">
                                    </div>
                                    <div class="form-group">
                                        <label>Password:</label>
                                        <input type="password" id="password" placeholder="Enter password" class="input-field">
                                    </div>
                                    <button type="submit" class="button">Login</button>
                                </form>
                                <div id="login-result" class="result-box"></div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-login" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('vulnerable-login', 'flag-login')" class="button">Submit Flag</button>
                                <div id="flag-login-result"></div>
                            </div>
                            
                            <div id="vulnerable-login-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
                    
                case 'admin-panel':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">User Search Panel Challenge</h2>
                            <div class="challenge-box">
                                <h3>Search Users</h3>
                                <div class="search-container">
                                    <input type="text" id="search-input" placeholder="Enter search term..." class="input-field">
                                    <button onclick="searchUser()" class="button">Search</button>
                                </div>
                                <div id="search-result" class="result-box"></div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-xss" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('admin-panel', 'flag-xss')" class="button">Submit Flag</button>
                                <div id="flag-xss-result"></div>
                            </div>
                            
                            <div id="admin-panel-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
                    
                case 'file-upload':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">Document Browser Challenge</h2>
                            <div class="challenge-box">
                                <h3>Browse Documents</h3>
                                <div class="search-container">
                                    <input type="text" id="file-path" placeholder="Enter file path..." value="documents/" class="input-field">
                                    <button onclick="browseFiles()" class="button">Browse</button>
                                </div>
                                <div id="file-listing" class="code-area">Current directory: documents/</div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-traversal" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('file-upload', 'flag-traversal')" class="button">Submit Flag</button>
                                <div id="flag-traversal-result"></div>
                            </div>
                            
                            <div id="file-upload-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
                    
                case 'api-endpoint':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">Profile API Challenge</h2>
                            <div class="challenge-box">
                                <h3>User Profile Service</h3>
                                <p>GET /api/profile?id=USER_ID</p>
                                <div class="search-container">
                                    <input type="text" id="user-id" placeholder="Enter user ID..." value="1" class="input-field">
                                    <button onclick="callAPI()" class="button">Get Profile</button>
                                </div>
                                <div id="api-result" class="code-area">Ready to call API...</div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-api" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('api-endpoint', 'flag-api')" class="button">Submit Flag</button>
                                <div id="flag-api-result"></div>
                            </div>
                            
                            <div id="api-endpoint-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
                    
                case 'database-interface':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">Employee Portal Challenge</h2>
                            <div class="challenge-box">
                                <h3>Employee Database Access</h3>
                                <p>Welcome to the employee lookup system.</p>
                                
                                <div class="employee-section">
                                    <h4>Search Employee by ID:</h4>
                                    <div class="search-container">
                                        <input type="text" id="emp-id" placeholder="Enter employee ID (1-10)" value="1" class="input-field">
                                        <button onclick="lookupEmployee()" class="button">Search</button>
                                    </div>
                                </div>

                                <div class="employee-section">
                                    <h4>Department Filter:</h4>
                                    <select id="dept-filter" class="dept-select">
                                        <option value="all">All Departments</option>
                                        <option value="IT">IT Department</option>
                                        <option value="HR">HR Department</option>
                                        <option value="Finance">Finance Department</option>
                                        <option value="Marketing">Marketing Department</option>
                                    </select>
                                    <button onclick="filterByDepartment()" class="button">Filter</button>
                                </div>

                                <div id="employee-result" class="code-area">Click search to view employee information...</div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-database" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('database-interface', 'flag-database')" class="button">Submit Flag</button>
                                <div id="flag-database-result"></div>
                            </div>
                            
                            <div id="database-interface-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
                    
                case 'config-backup':
                    pageContent = `
                        ${commonStyles}
                        <div class="challenge-container">
                            <h2 class="challenge-header">System Files Challenge</h2>
                            <div class="challenge-box">
                                <h3>Available Files</h3>
                                <div class="file-tree">
                                    <div class="folder">📁 /system/</div>
                                    <div class="file-list">
                                        <div class="file-item" onclick="showBackupFile('database')">📄 database_backup.sql</div>
                                        <div class="file-item" onclick="showBackupFile('config')">📄 app_config.json</div>
                                        <div class="file-item" onclick="showBackupFile('users')">📄 users_export.csv</div>
                                        <div class="file-item" onclick="showBackupFile('secrets')">📄 .env.backup</div>
                                    </div>
                                </div>
                                <div id="backup-content" class="code-content hidden"></div>
                            </div>
                            
                            <div class="flag-submit-section">
                                <h4>Submit Flag:</h4>
                                <input type="text" id="flag-config" placeholder="Enter flag here..." class="input-field">
                                <button onclick="submitFlag('config-backup', 'flag-config')" class="button">Submit Flag</button>
                                <div id="flag-config-result"></div>
                            </div>
                            
                            <div id="config-backup-explanation"></div>
                            
                            <button onclick="loadVulnerableSite()" class="back-button">← Back to Dashboard</button>
                        </div>
                    `;
                    break;
            }
            
            browserContent.innerHTML = pageContent;
            currentUrl = pageId;
        }

        // Interactive functions for vulnerable pages
        window.checkLogin = function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const result = document.getElementById('login-result');
            
            if (username.includes("'") || username.includes("OR") || password.includes("'") || password.includes("OR")) {
                result.innerHTML = `
                    <div class="success-result">
                        <strong>Authentication Bypassed!</strong><br>
                        SQL Injection successful! You found the vulnerability!<br>
                        <strong>Flag revealed:</strong> <code>${flags['vulnerable-login']}</code>
                    </div>
                `;
            } else {
                result.innerHTML = `<div class="error-result">Invalid credentials. Access denied.</div>`;
            }
        };

        window.searchUser = function() {
            const input = document.getElementById('search-input').value;
            const result = document.getElementById('search-result');

            // Create the toggleable hint above the search box if it doesn't exist
            if (!document.getElementById('xss-hint')) {
                const hintContainer = document.createElement('div');
                hintContainer.id = 'xss-hint';
                hintContainer.style.display = 'none';
                hintContainer.style.color = '#555';
                hintContainer.style.fontStyle = 'italic';
                hintContainer.style.marginBottom = '0.5rem';
                hintContainer.innerHTML = 'Hint: There is a function called <code>flag()</code> that reveals the flag if triggered.';

                const toggleButton = document.createElement('button');
                toggleButton.textContent = 'Toggle Hint';
                toggleButton.style.display = 'block';
                toggleButton.style.marginBottom = '0.5rem';
                toggleButton.onclick = () => {
                    hintContainer.style.display = hintContainer.style.display === 'none' ? 'block' : 'none';
                };

                const searchBox = document.getElementById('search-input');
                searchBox.parentNode.insertBefore(toggleButton, searchBox);
                searchBox.parentNode.insertBefore(hintContainer, toggleButton);
            }

            let safeInput = input
                .replace(/</gi, "&lt;")
                .replace(/>/gi, "&gt;");

            const blacklist = [/script/i, /alert/i];
            if (blacklist.some(rx => rx.test(input))) {
                result.innerHTML = `<div>Blocked suspicious input.</div>`;
                return;
            }

            if (/[<>"']/.test(input)) {
                result.innerHTML = `
                    <div class="search-entry">
                        Showing results for: <b>${safeInput}</b><br>
                        <a href="#" title="${input}">Click here</a>
                    </div>
                `;
            } else {
                result.innerHTML = `<div>No results found for: <b>${safeInput}</b></div>`;
            }

            window.flag = function() {
                result.innerHTML += `
                    <div class="success-result">
                        XSS executed! Flag revealed: <code>${flags['admin-panel']}</code>
                    </div>
                `;
            };
        };

        window.browseFiles = function() {
            const path = document.getElementById('file-path').value;
            const result = document.getElementById('file-listing');
            
            if (path.includes('../') && path.includes('etc/passwd')) {
                result.innerHTML = `Path traversal successful!
Flag found: ${flags['file-upload']}

Contents of /etc/passwd:
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
admin:x:1000:1000:Admin User:/home/admin:/bin/bash
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin`;
            } else if (path.includes('../')) {
                result.innerHTML = `Access denied: ${path}
Invalid path specified.`;
            } else {
                result.innerHTML = `Current directory: ${path}
report.pdf
invoice.xlsx
readme.txt
data/`;
            }
        };

        window.callAPI = function() {
            const userId = document.getElementById('user-id').value;
            const result = document.getElementById('api-result');
            
            if (userId.toLowerCase() === 'admin' || userId === '0') {
                result.innerHTML = `HTTP/1.1 200 OK
Content-Type: application/json

{
    "id": "admin",
    "username": "administrator", 
    "role": "super_admin",
    "email": "admin@company.com",
    "secret_flag": "${flags['api-endpoint']}",
    "permissions": ["read", "write", "delete", "admin"]
}`;
            } else {
                result.innerHTML = `HTTP/1.1 200 OK
Content-Type: application/json

{
    "id": "${userId}",
    "username": "user${userId}",
    "role": "user", 
    "email": "user${userId}@company.com",
    "permissions": ["read"]
}`;
            }
        };

        window.lookupEmployee = function() {
            const empId = document.getElementById('emp-id').value;
            const result = document.getElementById('employee-result');
            
            // Create realistic employee data
            const employees = {
                '1': { name: 'John Smith', dept: 'IT', position: 'Developer', email: 'john.smith@company.com' },
                '2': { name: 'Sarah Johnson', dept: 'HR', position: 'HR Manager', email: 'sarah.johnson@company.com' },
                '3': { name: 'Mike Davis', dept: 'Finance', position: 'Accountant', email: 'mike.davis@company.com' },
                '4': { name: 'Lisa Wilson', dept: 'Marketing', position: 'Marketing Lead', email: 'lisa.wilson@company.com' },
                '5': { name: 'Tom Brown', dept: 'IT', position: 'System Admin', email: 'tom.brown@company.com' },
                '6': { name: 'Anna Garcia', dept: 'Finance', position: 'Financial Analyst', email: 'anna.garcia@company.com' },
                '7': { name: 'David Lee', dept: 'IT', position: 'Security Analyst', email: 'david.lee@company.com' },
                '8': { name: 'Emma Taylor', dept: 'HR', position: 'Recruiter', email: 'emma.taylor@company.com' },
                '9': { name: 'James Miller', dept: 'Marketing', position: 'Designer', email: 'james.miller@company.com' },
                '10': { name: 'Admin User', dept: 'IT', position: 'Database Admin', email: 'admin@company.com' }
            };

            if (empId === '10' || empId.toLowerCase() === 'admin') {
                result.innerHTML = `Employee Found:

ID: 10
Name: Admin User  
Department: IT
Position: Database Administrator
Email: admin@company.com
Access Level: ADMINISTRATOR

[SYSTEM] Database credentials exposed:
Database: company_db
Username: db_admin  
Password: P@ssw0rd123!

[FLAG] ${flags['database-interface']}

Warning: This information should not be accessible to regular users!`;
            } else if (employees[empId]) {
                const emp = employees[empId];
                result.innerHTML = `Employee Found:

ID: ${empId}
Name: ${emp.name}
Department: ${emp.dept}  
Position: ${emp.position}
Email: ${emp.email}
Access Level: USER`;
            } else {
                result.innerHTML = `Employee ID ${empId} not found in database.
Please enter a valid employee ID (1-10).`;
            }
        };

        window.filterByDepartment = function() {
            const dept = document.getElementById('dept-filter').value;
            const result = document.getElementById('employee-result');
            
            if (dept === 'all') {
                result.innerHTML = `All Employees:

1. John Smith (IT) - Developer
2. Sarah Johnson (HR) - HR Manager  
3. Mike Davis (Finance) - Accountant
4. Lisa Wilson (Marketing) - Marketing Lead
5. Tom Brown (IT) - System Admin
6. Anna Garcia (Finance) - Financial Analyst
7. David Lee (IT) - Security Analyst
8. Emma Taylor (HR) - Recruiter
9. James Miller (Marketing) - Designer
10. Admin User (IT) - Database Admin`;
            } else {
                const deptEmployees = {
                    'IT': ['1. John Smith - Developer', '5. Tom Brown - System Admin', '7. David Lee - Security Analyst', '10. Admin User - Database Admin'],
                    'HR': ['2. Sarah Johnson - HR Manager', '8. Emma Taylor - Recruiter'],
                    'Finance': ['3. Mike Davis - Accountant', '6. Anna Garcia - Financial Analyst'],
                    'Marketing': ['4. Lisa Wilson - Marketing Lead', '9. James Miller - Designer']
                };
                
                result.innerHTML = `${dept} Department Employees:

${deptEmployees[dept].join('\n')}`;
            }
        };

        window.showBackupFile = function(fileType) {
            const content = document.getElementById('backup-content');
            content.classList.remove('hidden');
            
            switch(fileType) {
                case 'database':
                    content.innerHTML = `-- MySQL Database Backup
-- Generated on 2024-01-15
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    email VARCHAR(100)
);

INSERT INTO users VALUES 
(1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin@company.com'),
(2, 'user1', '5d41402abc4b2a76b9719d911017c592', 'user1@company.com');`;
                    break;
                    
                case 'config':
                    content.innerHTML = `{
    "app_name": "SecureApp",
    "version": "1.0.0",
    "debug": true,
    "database": {
        "host": "localhost",
        "port": 3306,
        "name": "company_db"
    },
    "api_keys": {
        "external_service": "sk_live_abcd1234567890"
    }
}`;
                    break;
                    
                case 'users':
                    content.innerHTML = `id,username,email,role,status
1,admin,admin@company.com,administrator,active
2,john_doe,john@company.com,user,active  
3,jane_smith,jane@company.com,user,inactive
4,test_user,test@company.com,user,active`;
                    break;
                    
                case 'secrets':
                    content.innerHTML = `# Environment Variables Backup
DB_PASSWORD=super_secret_password_123
JWT_SECRET=my_jwt_secret_key_here
ADMIN_API_KEY=admin_key_12345
ENCRYPTION_KEY=aes256_encryption_key

# Security Flag (DO NOT COMMIT TO REPO)
CTF_FLAG=${flags['config-backup']}

# Third-party API keys
STRIPE_SECRET=sk_test_abcdef123456
AWS_SECRET_KEY=AKIAIOSFODNN7EXAMPLE`;
                    break;
            }
        };

        // Terminal window controls
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideTerminal();
        });

        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideTerminal();
        });

        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMaximize();
        });

        // Taskbar icons
        terminalIcon.addEventListener('click', () => {
            if (isTerminalVisible) {
                hideTerminal();
            } else {
                showTerminal();
            }
        });

        // Terminal visibility functions
        function showTerminal() {
            terminalContainer.classList.remove('hidden');
            terminalIcon.classList.add('active');
            isTerminalVisible = true;
            term.focus();
        }

        function hideTerminal() {
            terminalContainer.classList.add('hidden');
            terminalIcon.classList.remove('active');
            isTerminalVisible = false;
        }

        function toggleMaximize() {
            terminalContainer.classList.toggle('maximized');
            setTimeout(() => term.fit && term.fit(), 100);
        }

        // Dragging functionality
        terminalHeader.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('close') || 
                e.target.classList.contains('minimize') || 
                e.target.classList.contains('maximize')) {
                return;
            }
            
            isDragging = true;
            terminalContainer.classList.add('dragging');
            
            const rect = terminalContainer.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', stopDrag);
            e.preventDefault();
        });

        function handleDrag(e) {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffsetX;
            const y = e.clientY - dragOffsetY;
            
            const maxX = window.innerWidth - terminalContainer.offsetWidth;
            const maxY = window.innerHeight - terminalContainer.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(x, maxX));
            const constrainedY = Math.max(35, Math.min(y, maxY));
            
            terminalContainer.style.left = `${constrainedX}px`;
            terminalContainer.style.top = `${constrainedY}px`;
            terminalContainer.style.transform = 'none';
        }

        function stopDrag() {
            isDragging = false;
            terminalContainer.classList.remove('dragging');
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', stopDrag);
        }

        // Typing effect
        async function typeLine(line, delay = 10){
            for(let ch of line){
                term.write(ch);
                await new Promise(r => setTimeout(r, delay));
            }
            term.writeln('');
        }

        // Redraw current input line
        function redrawInput() {
            term.write('\r');
            term.write('\x1B[K');
            term.write(prompt());
            term.write(currentInput);
            
            const totalPromptLength = prompt().replace(/\x1B\[[0-9;]*m/g, '').length;
            const targetCol = totalPromptLength + cursorPosition;
            term.write(`\x1B[${targetCol + 1}G`);
        }

        // Show intro with ASCII art and glitch effects
        async function showIntro(){
            term.clear();

            if (window.innerWidth < 1024) {
                introFinished = true;
                term.write(prompt());
                return;
            }

            const skullArt = [
                "",
                "                    ███████╗ █████╗ ██╗   ██╗██████╗ ",
                "                    ██╔════╝██╔══██╗██║   ██║██╔══██╗",
                "                    ███████╗███████║██║   ██║██║  ██║",
                "                    ╚════██║██╔══██║██║   ██║██║  ██║",
                "                    ███████║██║  ██║╚██████╔╝██████╔╝",
                "                    ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ",
                "",
                "                ┌──────────────────────────────────────┐",
                "                │ $ sudo access granted                │",
                "                │ $ initializing secure shell...       │",
                "                │ $ connection established ✓           │",
                "                │ $ welcome to saud@portfolio          │",
                "                │ $ browser available for CTF hunting  │",
                "                └──────────────────────────────────────┘",
                "",
                "──────────────────────────────────────────────────────────────────",
                "Run 'nmap localhost' to discover services | 'browser' to hunt flags",
                "──────────────────────────────────────────────────────────────────",
                ""
            ];

            for(let i = 0; i < skullArt.length; i++) {
await typeLine(skullArt[i], 1);            }

            introFinished = true;
            term.write(prompt());
        }

        // Glitch effect typing
        async function glitchTypeLine(line, delay) {
            const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
            let displayLine = '';
            
            for(let i = 0; i < line.length; i++) {
                for(let g = 0; g < 2; g++) {
                    const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    term.write('\r' + displayLine + glitchChar);
                    await new Promise(r => setTimeout(r, 5));
                }
                
                displayLine += line[i];
                term.write('\r' + displayLine);
                await new Promise(r => setTimeout(r, delay));
            }
            term.writeln('');
        }

        // Handle commands
        async function handleCommand(cmd){
            if(cmd){ commandHistory.push(cmd); historyIndex = commandHistory.length; }
            const command = cmd.trim().toLowerCase();
            const args = command.split(' ');
            
            switch(args[0]){
                case "help": 
                    if (!scanCompleted) {
                        await typeLine("Available commands: nmap, browser, help, clear");
                        await typeLine("Start by running: nmap localhost");
                        await typeLine("Try 'browser' to access vulnerable web applications");
                    } else {
                        await typeLine("\x1B[36m=== Available Commands ===\x1B[0m");
                        await typeLine("Navigation:");
                        await typeLine("  nmap         - Network mapping");
                        await typeLine("  connect      - Connect to ports");
                        await typeLine("  browser      - Launch web browser");
                        await typeLine("\x1B[36m=== Advanced Tools ===\x1B[0m");
                        await typeLine("Analysis:");
                        await typeLine("  scan         - Deep system analysis");
                        await typeLine("  sysinfo      - System information");
                        await typeLine("  trace        - Network route trace");
                        await typeLine("Cryptography:");
                        await typeLine("  decrypt      - Decrypt hashes");
                        await typeLine("\x1B[36m=== CTF Progress ===\x1B[0m");
                        await typeLine("  flags        - View found flags");
                        await typeLine("  points       - Check current score");
                        await typeLine("  clear        - Clear terminal");
                    }
                    break;
                case "clear": 
                    term.clear(); 
                    break;
                case "browser":
                    await typeLine("Opening vulnerable browser environment...");
                    await typeLine("Click the browser icon in taskbar or use browser window");
                    showBrowser();
                    break;
                case "nmap":
                    await runNmapScan();
                    break;
                case "connect":
                    if (!scanCompleted) {
                        await typeLine("Error: Run nmap scan first to discover open ports");
                        break;
                    }
                    if (args.length < 2) {
                        await typeLine("Usage: connect <port>");
                        await typeLine("Example: connect 22");
                        break;
                    }
                    const port = parseInt(args[1]);
                    if (ports[port]) {
                        await connectToPort(port, ports[port]);
                    } else {
                        await typeLine(`Error: Port ${port} is not open or does not exist`);
                        await typeLine("Run 'nmap localhost' to see available ports");
                    }
                    break;
                case "flags":
                    await typeLine(`CTF Progress: ${foundFlags.size}/${totalFlags} flags found`);
                    await typeLine(`Current Score: ${userPoints}/${totalFlags * pointsPerFlag} points`);
                    if (foundFlags.size > 0) {
                        await typeLine("Found flags:");
                        for (const flag of foundFlags) {
                            await typeLine(`- ${flags[flag]}`);
                        }
                    } else {
                        await typeLine("No flags captured yet. Use 'browser' to start hunting!");
                    }
                    if (foundFlags.size === totalFlags) {
                        await typeLine("🎉 CONGRATULATIONS! All flags captured! 🎉");
                        await typeLine("You've mastered web application security testing!");
                    }
                    break;
                case "points":
                    await typeLine(`Your Current Score: ${userPoints}/${totalFlags * pointsPerFlag} points`);
                    await typeLine(`Flags Captured: ${foundFlags.size}/${totalFlags}`);
                    await typeLine(`Points per flag: ${pointsPerFlag}`);
                    if (foundFlags.size < totalFlags) {
                        await typeLine(`Remaining points: ${(totalFlags - foundFlags.size) * pointsPerFlag}`);
                        await typeLine("Keep hunting in the browser to earn more points!");
                    } else {
                        await typeLine("Perfect score achieved! You're a cybersecurity expert!");
                    }
                    break;
                case "scan":
                    await typeLine("\x1B[33mInitiating deep scan of target system...\x1B[0m");
                    await typeLine("━".repeat(50));
                    await typeLine("Scanning ports: [" + "▓".repeat(20) + "]");
                    await typeLine("Found vulnerable services:");
                    await typeLine("➤ SSH (port 22) - OpenSSH 7.6p1");
                    await typeLine("➤ HTTP (port 80) - Apache/2.4.29");
                    await typeLine("➤ MySQL (port 3306) - 5.7.32");
                    await typeLine("Analyzing system architecture...");
                    await typeLine("Memory mapping: 0x00000000 -> 0xFFFFFFFF");
                    await typeLine("System calls intercepted: execve(), open(), read()");
                    await typeLine("Detected security mechanisms:");
                    await typeLine("• ASLR: Enabled");
                    await typeLine("• DEP/NX: Enabled");
                    await typeLine("• Stack Canary: Present");
                    await typeLine("━".repeat(50));
                    await typeLine("\x1B[32mScan complete. System analyzed.\x1B[0m");
                    break;

                case "decrypt":
                    if (args.length < 2) {
                        await typeLine("Usage: decrypt <hash>");
                        await typeLine("Example: decrypt 5f4dcc3b5aa765d61d8327deb882cf99");
                        break;
                    }
                    await typeLine("\x1B[33mInitiating cryptographic analysis...\x1B[0m");
                    await typeLine("Testing multiple algorithms...");
                    for(let i = 0; i < 3; i++) {
                        await typeLine(`[${"-".repeat(i*10)}>${" ".repeat(20-i*10)}] ${i*33}%`);
                        await new Promise(r => setTimeout(r, 500));
                    }
                    await typeLine("Hash type identified: MD5");
                    await typeLine("Attempting dictionary attack...");
                    await typeLine("Checking rainbow tables...");
                    await typeLine("\x1B[32mDecryption successful!\x1B[0m");
                    await typeLine(`Original hash: ${args[1]}`);
                    await typeLine(`Decrypted value: ${args[1] === "5f4dcc3b5aa765d61d8327deb882cf99" ? "password" : "unknown"}`);
                    break;

                case "sysinfo":
                    await typeLine("\x1B[33mGathering system information...\x1B[0m");
                    await typeLine("┌─────────────────────────────────────┐");
                    await typeLine("│ System Analysis                     │");
                    await typeLine("├─────────────────────────────────────┤");
                    await typeLine("│ CPU: Intel(R) Core(TM) i7          │");
                    await typeLine("│ Memory: 16384MB                    │");
                    await typeLine("│ Kernel: Linux 5.4.0-42-generic     │");
                    await typeLine("│ Architecture: x86_64               │");
                    await typeLine("│ Active Processes: 243              │");
                    await typeLine("│ Network Interfaces: eth0, wlan0    │");
                    await typeLine("│ Root Access: Enabled               │");
                    await typeLine("└─────────────────────────────────────┘");
                    await typeLine("\x1B[36mAnalyzing network topology...\x1B[0m");
                    await typeLine("Found 3 active network interfaces:");
                    await typeLine("eth0: 192.168.1.100/24 (1000 Mb/s)");
                    await typeLine("wlan0: 192.168.2.50/24 (300 Mb/s)");
                    await typeLine("tun0: 10.8.0.1/24 (VPN Active)");
                    break;

                case "trace":
                    await typeLine("\x1B[33mInitiating network trace...\x1B[0m");
                    const hops = [
                        "192.168.1.1 (1ms)",
                        "10.0.0.1 (5ms)",
                        "172.16.0.1 (15ms)",
                        "backbone-router-1.isp.net (25ms)",
                        "core-router-2.isp.net (40ms)",
                        "edge-router-3.isp.net (55ms)",
                        "target-server.com (70ms)"
                    ];
                    for(let hop of hops) {
                        await typeLine(`[+] Hop detected: ${hop}`);
                        await new Promise(r => setTimeout(r, 200));
                    }
                    await typeLine("\x1B[32mTrace complete. Route mapped.\x1B[0m");
                    await typeLine("Network path visualization:");
                    await typeLine("You → ISP → Backbone → Target");
                    await typeLine("Total hops: 7 | RTT: 70ms");
                    break;

                case "kali":
                    await typeLine("Switching terminal theme...");
                    toggleKaliTheme();
                    await typeLine(isKaliTheme ? "Kali Linux theme activated!" : "Default theme restored!");
                    break;

                case "": 
                    break;
                default: 
                    if (!scanCompleted) {
                        await typeLine("Command not recognized. Try 'nmap localhost' to start scanning.");
                    } else {
                        await typeLine("Command not recognized. Type 'help' for available commands.");
                    }
            }
            term.write(prompt());
            cursorPosition = 0;
        }

        // Nmap scan simulation
        async function runNmapScan() {
            await typeLine("Starting Nmap 7.94 ( https://nmap.org )");
            await typeLine("Nmap scan report for localhost");
            await typeLine("Host is up (0.000s latency).");
            await typeLine("");
            
            if (window.innerWidth < 1024) {
                await typeLine("PORT   STATE SERVER");
                for (const [port, service] of Object.entries(ports)) {
                    await new Promise(r => setTimeout(r, 200));
                    await typeLine(`${port.padEnd(6)} open  ${service}`);
                }
            } else {
                await typeLine("PORT     STATE SERVER       DESCRIPTION");
                for (const [port, service] of Object.entries(ports)) {
                    await new Promise(r => setTimeout(r, 200));
                    let description;
                    switch(service) {
                        case "about": description = "Personal Information"; break;
                        case "projects": description = "Development Projects"; break;
                        case "certifications": description = "My Certifications"; break;
                        case "labs": description = "Lab practices"; break;
                        case "skills": description = "Technical & Soft Skills"; break;
                        case "contact": description = "Contact Details"; break;
                        case "tryhackme": description = "TryHackMe Profile"; break;
                    }
                    await typeLine(`${port.padEnd(8)} open  ${service.padEnd(12)} ${description}`);
                }
            }
            
            await typeLine("");
            await typeLine("Nmap done: 1 IP address (6 ports open) scanned");
            await typeLine("");
            await typeLine("Use 'connect <port>' to access servers");
            await typeLine("Use 'browser' to access vulnerable web applications");
            
            scanCompleted = true;
        }

        // Connect to port
        async function connectToPort(port, service) {
            await typeLine(`Connecting to localhost:${port}...`);
            await typeLine(`Connected to ${service} server.`);
            await typeLine("─".repeat(50));
            
            if (service === "tryhackme") {
                await typeLine("Opening TryHackMe profile...");
                const thmUrl = 'https://tryhackme.com/p/blackoutx8';
                
                // Check if mobile device
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    // Show mobile-friendly button
                    const mobileBtn = document.createElement('button');
                    mobileBtn.textContent = 'Open TryHackMe Profile';
                    mobileBtn.style.cssText = `
                        position: fixed;
                        bottom: 80px;
                        left: 50%;
                        transform: translateX(-50%);
                        padding: 12px 24px;
                        background: #141d2b;
                        color: #00ff00;
                        border: 2px solid #00ff00;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: monospace;
                        cursor: pointer;
                        z-index: 9999;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    `;
                    mobileBtn.onclick = () => window.open(thmUrl, '_blank');
                    document.body.appendChild(mobileBtn);
                    
                    // Remove button after 8 seconds
                    setTimeout(() => mobileBtn.remove(), 8000);
                    
                    await typeLine("Tap the button below to open profile");
                } else {
                    // Original laptop behavior
                    window.open(thmUrl, '_blank');
                }
                await typeLine("Connection established successfully.");
            } else {
                for(const line of sections[service]) {
                    await typeLine(line, 15);
                }
            }
            
            await typeLine("─".repeat(50));
            await typeLine(`Connection to localhost:${port} closed.`);
        }

        // Keyboard input with proper cursor control
        term.onKey(e => {
            const key = e.key;
            const keyCode = e.domEvent.keyCode;
            
            if (!introFinished) {
                e.domEvent.preventDefault();
                return;
            }
            
            e.domEvent.preventDefault();
            
            if (key === '\r') {
                term.writeln('');
                handleCommand(currentInput);
                currentInput = "";
                cursorPosition = 0;
            }
            else if (key === '\u007F') {
                if (cursorPosition > 0) {
                    currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
                    cursorPosition--;
                    redrawInput();
                }
            }
            else if (key === '\t') {
                const partialCommand = currentInput.slice(0, cursorPosition);
                
                if (!scanCompleted) {
                    const match = ["nmap", "browser", "help", "clear"].find(c => c.startsWith(partialCommand));
                    if (match) {
                        currentInput = match + currentInput.slice(cursorPosition);
                        cursorPosition = match.length;
                        redrawInput();
                    }
                } else {
                    if (partialCommand.startsWith("connect ")) {
                        const portPart = partialCommand.split(" ")[1] || "";
                        const availablePorts = Object.keys(ports);
                        const match = availablePorts.find(p => p.startsWith(portPart));
                        if (match) {
                            currentInput = "connect " + match + currentInput.slice(cursorPosition);
                            cursorPosition = ("connect " + match).length;
                            redrawInput();
                        }
                    } else {
                        const match = commands.find(c => c.startsWith(partialCommand));
                        if (match) {
                            currentInput = match + currentInput.slice(cursorPosition);
                            cursorPosition = match.length;
                            redrawInput();
                        }
                    }
                }
            }
            else if (keyCode === 37) {
                if (cursorPosition > 0) {
                    cursorPosition--;
                    redrawInput();
                }
            }
            else if (keyCode === 39) {
                if (cursorPosition < currentInput.length) {
                    cursorPosition++;
                    redrawInput();
                }
            }
            else if (keyCode === 38) {
                if (historyIndex > 0) {
                    historyIndex--;
                    currentInput = commandHistory[historyIndex] || "";
                    cursorPosition = currentInput.length;
                    redrawInput();
                }
            }
            else if (keyCode === 40) {
                if (historyIndex < commandHistory.length) {
                    historyIndex++;
                    currentInput = commandHistory[historyIndex] || "";
                    cursorPosition = currentInput.length;
                    redrawInput();
                }
            }
            else if (keyCode === 36) {
                cursorPosition = 0;
                redrawInput();
            }
            else if (keyCode === 35) {
                cursorPosition = currentInput.length;
                redrawInput();
            }
            else if (keyCode === 46) {
                if (cursorPosition < currentInput.length) {
                    currentInput = currentInput.slice(0, cursorPosition) + currentInput.slice(cursorPosition + 1);
                    redrawInput();
                }
            }
            else if (key.length === 1 && !e.domEvent.ctrlKey && !e.domEvent.altKey) {
                currentInput = currentInput.slice(0, cursorPosition) + key + currentInput.slice(cursorPosition);
                cursorPosition++;
                redrawInput();
            }
        });

        // Disable text selection and context menu inside terminal
        const termElement = document.getElementById('terminal');
        termElement.addEventListener('mousedown', e => e.preventDefault());
        termElement.addEventListener('selectstart', e => e.preventDefault());
        termElement.addEventListener('contextmenu', e => e.preventDefault());

        // Prevent cursor movement via mouse clicks
        termElement.addEventListener('click', e => {
            e.preventDefault();
            term.focus();
        });

        // LinkedIn button
        const linkedin = document.getElementById('linkedin');
        linkedin.addEventListener('click', () => {
            window.open('https://www.linkedin.com/in/saud-althubyani-0748b9312','_blank');
        });

        // Clock functionality
        function updateClock() {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            };
            const timeString = now.toLocaleString('en-US', options);
            document.getElementById('clock').textContent = timeString;
        }

        // Add window resize handler to adjust terminal
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth < 1024;
            term.resize(isMobile ? 50 : 80, isMobile ? 30 :  24);
            if (term.fit) term.fit();
        });

        // Update clock every second
        setInterval(updateClock, 1000);
        updateClock();

        // Prevent dragging when clicking on terminal content
        termElement.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        // Initialize terminal
        terminalIcon.classList.add('active');
        showIntro();

        // Focus terminal when clicked anywhere inside
        terminalContainer.addEventListener('click', () => {
            if (isTerminalVisible) {
                term.focus();
            }
        });

        // Replace the toggleKaliTheme function with this improved version
function toggleKaliTheme() {
    isKaliTheme = !isKaliTheme;
    
    // Use more reliable image URLs
    const backgroundImage = isKaliTheme 
        ? 'url("https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop")'  // Dark tech wallpaper
        : 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Ubuntu_25.04_Plucky_Puffin_Desktop_English.png/1200px-Ubuntu_25.04_Plucky_Puffin_Desktop_English.png")';
    
    // Force the background change with higher specificity
    document.body.style.setProperty('background-image', backgroundImage, 'important');
    document.body.style.setProperty('background-size', 'cover', 'important');
    document.body.style.setProperty('background-position', 'center', 'important');
    document.body.style.setProperty('background-repeat', 'no-repeat', 'important');
    document.body.classList.toggle('kali-theme');
    
function toggleKaliTheme() {
    isKaliTheme = !isKaliTheme;
    
    if (isKaliTheme) {
        document.body.style.background = '#000000';
        document.body.style.backgroundImage = 'none';
        document.documentElement.style.background = '#000000';
        document.documentElement.style.backgroundImage = 'none';
        
        // Update terminal theme colors
        term.setOption('theme', {
            background: '#000000',
            foreground: '#040404ff',
            cursor: '#00ff00',
            cursorAccent: '#000000',
            selection: 'rgba(0, 255, 0, 0.3)'
        });
        
        // Update terminal container
        if (terminalContainer) {
            terminalContainer.style.background = 'rgba(0, 0, 0, 0.95)';
            terminalContainer.style.border = '1px solid #00ff00';
        }
        
        // Update terminal header
        const terminalHeader = document.getElementById('terminal-header');
        if (terminalHeader) {
            terminalHeader.style.background = '#000000';
            terminalHeader.style.color = '#00ff00';
            terminalHeader.style.borderBottom = '1px solid #00ff00';
        }
        
        // Update taskbar
        const taskbar = document.querySelector('.desktop-taskbar');
        if (taskbar) {
            taskbar.style.background = 'rgba(0, 0, 0, 0.95)';
            taskbar.style.borderBottom = '1px solid #00ff00';
        }
        
        // Update clock
        const clock = document.querySelector('.clock-container');
        if (clock) {
            clock.style.background = '#000000';
            clock.style.color = '#00ff00';
            clock.style.border = '1px solid #00ff00';
        }
        
        // Update terminal icon and title
        const terminalIconImg = document.querySelector('.terminal-icon-img');
        const titleElement = document.querySelector('.title');
        
        if (terminalIconImg) {
            terminalIconImg.src = 'https://img.icons8.com/color/48/000000/kali-linux.png';
        }
        if (titleElement) {
            titleElement.textContent = "Kali Linux Terminal";
        }
        
    } else {
        // Restore original background
        document.body.style.background = '';
        document.body.style.backgroundImage = "url('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Ubuntu_25.04_Plucky_Puffin_Desktop_English.png/1200px-Ubuntu_25.04_Plucky_Puffin_Desktop_English.png')";
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        
        document.documentElement.style.background = '';
        document.documentElement.style.backgroundImage = '';
        
        // Restore terminal theme
        term.setOption('theme', {
            background: '#1e1e2f',
            foreground: '#c5c6c7',
            cursor: '#c5c6c7',
            cursorAccent: '#1e1e2f',
            selection: 'rgba(197, 198, 199, 0.3)'
        });
        
        // Restore terminal container
        if (terminalContainer) {
            terminalContainer.style.background = 'rgba(11, 12, 16, 0.95)';
            terminalContainer.style.border = '';
        }
        
        // Restore terminal header
        const terminalHeader = document.getElementById('terminal-header');
        if (terminalHeader) {
            terminalHeader.style.background = '';
            terminalHeader.style.color = '';
            terminalHeader.style.borderBottom = '';
        }
        
        // Restore taskbar
        const taskbar = document.querySelector('.desktop-taskbar');
        if (taskbar) {
            taskbar.style.background = '';
            taskbar.style.borderBottom = '';
        }
        
        // Restore clock
        const clock = document.querySelector('.clock-container');
        if (clock) {
            clock.style.background = '';
            clock.style.color = '';
            clock.style.border = '';
        }
        
        // Restore icons and title
        const terminalIconImg = document.querySelector('.terminal-icon-img');
        const titleElement = document.querySelector('.title');
        
        if (terminalIconImg) {
            terminalIconImg.src = 'https://img.icons8.com/fluent/600/linux-terminal.png';
        }
        if (titleElement) {
            titleElement.textContent = "Saud's Terminal Portfolio";
        }
    }
    
    console.log('Kali theme toggled:', isKaliTheme);
}}