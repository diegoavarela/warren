# User Journey Maps - how the app should flow


## there are 3 kind of roles:
- Platform Admin
- Organization Admin
- Regular User

### Platform Admin
- Should be able to manage companies
- Add/Edit/Disable companies
- Add an admin user for that company
- When adding that company and user, should email the admin with the invite to register
- the platform admin should have 2fa

### Organization Admin
- should be able to create different companies
- the companies should have their own configuration, location, currency, language, 2fa
- should be able to create users with different profiles (admin/user), when creating users, it should send an email to the user to accept the invite.
- Admin when logs in should see:
    - small card widgets with info: companies, users, templates, data available.
    - company selector to manage, delete or create company (as it is now)
- When Admin clicks on a company
    - small card widgets where sees: users, templates, data available
    - Financial Data where ONLY sees: P&L and Cashflow
    - templates (as it is)
    - users (as it is)
- When admin clicks on P&L - View data
    - The P&L Dashboard appears, but it needs to show the NEW improved dashboard, not the old one, and it should allow me to navigate ONLY to Cashflow is Cashflow has data.
    - The P&L Should SHOW: (taken from dashboard/company-admin/pnl)
        - at the top: Company - Period - Last update
        - the filter for (period, compare with, currency, units - no change here)
        - YTD (as it is)
        - Inbound (as it is) - but the data is hard to read, needs to be validated with puppeteer or something like this, it is too big the font and the cards aren't well structured
        - Costs (as it is) - review as well the font size and the structure of the card, can't be read well.
        - Personnel costs (as you have in the fiinancial /dashboard/company-admin/financial/a0911a1c-a3b4-441e-bcb5-17218532e453/dashboard )
        - Analisis de Crecimiento de ingresos (as  you have here: /dashboard/company-admin/financial/a0911a1c-a3b4-441e-bcb5-17218532e453/dashboard)
        - Rentabilidad (as it is) - same issue, can't see the data well
        - Analisis de gastos operaciones  - (if no data, should say that there is no data or even better, don't show the widget)
        - Eficiencia de costos and resumen  de impuestos, as they are
        - analisis y tendencias - 
            - tendencia de márgenes: can be really done better
            - resumen financiero: it says it shows 6 months, but it is showing only 1.
        - Heatmaps should have a label above, also when clicking on some points of the heatmaps, should RECALCULATE the whole heatmap.
        - Resumen Bancario and Portal de inversiones should have a title as well.
        - Analisis de eficiencia de costos is ok.
        - Key points are ok.
    - Considerations:
        - The page refreshes every other time, that is more than annoying.
        - up in the navbar says DASHBOARD, should NOT appear that
        - the excecutive dashbaord shall disappear
        - it is not multilanguage
        - the combo of the currencies should have the flag of each country
        - Each card has to have a multilingual modal help, that should be shown with a ? at the corner, and when clicked, it should detaily explain what is going on with that metric, with the users data.
- when admin clicks on P&L - upload new
    - the start processing page should allow the user to select a template. If the user chooses a template, then the mapping has to happen automatically, going to the end of the page just only for validation of the user. If not template selected, then continue the normal flow.
    - it also should ask or detect on what units is it expressed
    - the page advanced visual mapper:
        - it has three active buttons:
            - AI Analysis
            - Manual Mapping
            - Next

            it feels next shouldn't be availabe if we don't know what is the approach or next implies manual mapping? it is confusing
        - when clicking in AI Analysis, it show show what is detecting
        - When choosing the currency: the next button on the top says CONTINUAR and the bottom one says SIGUIENTE, need to say the same. Also has to have same size and format.
        - Advanced visual mapper should show some help on what needs to be done. It is far to be intuitive.
        - on Datos - the auto detect why is not done inmmediately? that is something that you need to press all the time and it is not clear that you have to.
        - the Classification, has a monstruosity in the middle of the page, that it stoppes the user to touch things, but it appears not in the middle of the page but in the middle of the grid, where it goes very down on the page.
        - also on the classification there should be a tip on how things need to be done, I'd add a ? as well here and explain the process
        - whe showing all the rows, limitate to show the rows that actually have data, not the empty ones.
        - when clicking save the validation summary has to be a bit stronger, the UI is lousy. 
        - after saving it should go the the P&L dashboard with the new data.
        - the chance to view previous statements shall CLEARLY SAY that it is not the last one, and show which is it.
- when admin click on upload new cashflow
    - the process has to mock the P&L
- the templates made within one organization are valid for the whole set of companies, when choosing the template it should EXPLICITELY say in what company has been made, but can be used.

### regular users
- When logs in, it sees their card if info where it shows what data is available, and the chance to see the P&L and Cashflow, that's it. What the user sees is the same that what the admin sees, but without all the mapping, planning, admin thing, very neat and simple.

### considerations
- we need the ? help everywhere on every card needs to be there, it has to explain what to do and what is there, it has to be multilingual
- all the whole app has to be multilingual
- add as configuration of the companies 2FA using an app to authenticate
- configure email (i have a lambda on ses to send emails ready to use)
- the UI has to be incredible professional and should look astonishing.
- create tests to manage coverage and nothing breaks.
- the export should be done in a way that they look incredible professional.
- the avatar, when clicking on the options, have to be functional, it should NOT have any mock functionality.
- We will use the NEON database for all the things we are doing
- IT WILL run in vercel
- you can ask me questions all over the time when you want.