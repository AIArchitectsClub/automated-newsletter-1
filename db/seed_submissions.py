"""Seed script: populate synthetic newsletter submissions for testing.

To create a new batch of events later, edit SUBMISSIONS below (swap in a
fresh list) and rerun: `python -m db.seed_submissions`. Each run inserts
new rows — it doesn't deduplicate against what's already there, since a
fresh batch of events each time is the expected use, not idempotent setup
like db/setup.py.

No attachments are created here (synthetic file bytes wouldn't be
meaningful test data) — just text content, embedded with the same real
Hugging Face call /contribute uses, so search/Q&A testing reflects real
semantic behavior.
"""

import os

import psycopg
from dotenv import load_dotenv
from pgvector import Vector
from pgvector.psycopg import register_vector

load_dotenv()

from app.embeddings import get_embedding  # noqa: E402  (needs .env loaded first)

SUBMISSIONS = [
    {
        "contributor_name": "Priya Nair",
        "team": "Engineering",
        "title": "Migrated core services to Kubernetes",
        "body": "After three months of work, the platform team finished migrating our core services off the legacy VM fleet onto Kubernetes. Deploy times are down from 20 minutes to under 3, and we can now autoscale during traffic spikes without manual intervention.",
    },
    {
        "contributor_name": "Marcus Webb",
        "team": "Marketing",
        "title": "Q3 campaign results beat targets",
        "body": "Our Q3 'Back to Basics' campaign generated 40% more qualified leads than projected, driven mostly by the short-form video series on LinkedIn. Full breakdown and creative assets are in the shared drive for anyone planning Q4 campaigns.",
    },
    {
        "contributor_name": "Elena Torres",
        "team": "Sales",
        "title": "Closed our largest enterprise deal to date",
        "body": "After an eight-month sales cycle, we signed Acme Manufacturing to a three-year enterprise contract. Huge thanks to the solutions engineering team for the custom demo environment that sealed it.",
    },
    {
        "contributor_name": "Devon Clarke",
        "team": "People Ops",
        "title": "Annual benefits enrollment opens Monday",
        "body": "Open enrollment for health, dental, and vision plans runs from next Monday through the end of the month. Two live Q&A sessions are scheduled; recordings will be posted for anyone who can't attend live.",
    },
    {
        "contributor_name": "Sara Kim",
        "team": "Product",
        "title": "Dark mode shipped to all users",
        "body": "Dark mode is now live for 100% of users after a successful two-week rollout to 10% of traffic. Early feedback has been overwhelmingly positive, with support tickets about eye strain dropping to nearly zero.",
    },
    {
        "contributor_name": "Ravi Patel",
        "team": "Engineering",
        "title": "New on-call rotation cuts alert fatigue",
        "body": "We restructured the on-call rotation from weekly to daily shifts and added automatic alert deduplication. Pages per on-call shift dropped by 60% in the first month, and the team reports feeling much less burnt out.",
    },
    {
        "contributor_name": "Jenna Wu",
        "team": "Design",
        "title": "Unveiled our new brand identity",
        "body": "After six months of research and testing, we're rolling out a refreshed logo, color palette, and typography system across the website, product, and marketing materials. The new look goes live company-wide next week.",
    },
    {
        "contributor_name": "Tomas Novak",
        "team": "Customer Success",
        "title": "NPS score hits an all-time high of 68",
        "body": "Our latest customer survey shows an NPS of 68, up from 52 last quarter. The biggest driver was the new onboarding checklist that cut time-to-first-value from 12 days to 4.",
    },
    {
        "contributor_name": "Aisha Bello",
        "team": "Finance",
        "title": "Q2 budget review wrapped up",
        "body": "The Q2 budget review is complete and department heads should have received their updated allocations. Overall spend came in 3% under budget, largely due to renegotiated vendor contracts in infrastructure.",
    },
    {
        "contributor_name": "Liam O'Connor",
        "team": "Legal",
        "title": "Company-wide GDPR training completed",
        "body": "All employees have now completed the annual GDPR and data-handling refresher course. A special thanks to everyone who finished ahead of the deadline — compliance rate was 98%, our best yet.",
    },
    {
        "contributor_name": "Priya Nair",
        "team": "Engineering",
        "title": "Hackathon winners announced",
        "body": "This quarter's internal hackathon wrapped up with 14 teams presenting. First place went to 'Team Quill' for an AI-assisted changelog generator that's already being evaluated for production use.",
    },
    {
        "contributor_name": "Grace Lindqvist",
        "team": "People Ops",
        "title": "Employee wellness week kicks off Monday",
        "body": "Wellness week features daily guided meditation sessions, a subsidized massage therapist on-site Wednesday and Thursday, and a step-count challenge with prizes. Sign up in the wellness Slack channel.",
    },
    {
        "contributor_name": "Marcus Webb",
        "team": "Marketing",
        "title": "Rebranded our social media presence",
        "body": "All social channels now reflect the new brand identity, including refreshed cover art, bios, and a consistent posting template. Engagement on the first week of posts is already up 25% over baseline.",
    },
    {
        "contributor_name": "Diego Fernandez",
        "team": "Sales",
        "title": "2026 sales kickoff recap",
        "body": "Over 80 sales reps gathered for our annual kickoff, covering the new territory model, updated commission structure, and a preview of Q1 product launches. Slides and recordings are posted in the sales portal.",
    },
    {
        "contributor_name": "Ravi Patel",
        "team": "Engineering",
        "title": "Open sourced our internal CLI tool",
        "body": "We've open sourced 'fleetctl', the CLI tool our infra team built for managing deploy pipelines. It's already picked up 200 stars on GitHub in the first 48 hours and a few external contributors have opened PRs.",
    },
    {
        "contributor_name": "Chloe Bennett",
        "team": "Community",
        "title": "Volunteering day at the downtown food bank",
        "body": "Thirty employees spent Friday afternoon sorting and packing meals at the downtown food bank, contributing over 150 volunteer hours. We're planning to make this a quarterly tradition going forward.",
    },
    {
        "contributor_name": "Sam Okafor",
        "team": "IT",
        "title": "Office WiFi upgrade completed",
        "body": "The office-wide WiFi upgrade is complete, tripling available bandwidth and adding dedicated access points on every floor. Please report any lingering dead zones to the IT helpdesk.",
    },
    {
        "contributor_name": "Grace Lindqvist",
        "team": "Diversity & Inclusion",
        "title": "Women in Tech panel draws record attendance",
        "body": "Our quarterly Women in Tech panel featured three external speakers and drew over 120 attendees, our largest turnout yet. A recording is available for anyone who missed it live.",
    },
    {
        "contributor_name": "Dr. Wen Zhao",
        "team": "R&D",
        "title": "Research paper accepted at NeurIPS",
        "body": "Our applied research team's paper on efficient retrieval-augmented generation was accepted at NeurIPS this year. This is our third consecutive year with an accepted paper at a major ML conference.",
    },
    {
        "contributor_name": "Sara Kim",
        "team": "Product",
        "title": "Customer feedback session surfaces new priorities",
        "body": "Last week's customer advisory board session surfaced a clear top request: bulk export functionality. It's being added to the Q1 roadmap based on how consistently it came up across all eight participating customers.",
    },
    {
        "contributor_name": "Isabella Rossi",
        "team": "Facilities",
        "title": "New Austin office space now open",
        "body": "Our new Austin office officially opened its doors this week, with capacity for 60 employees and a dedicated client demo suite. An open house for remote employees visiting the area is planned for next month.",
    },
    {
        "contributor_name": "Ravi Patel",
        "team": "Engineering",
        "title": "Ran a company-wide security incident drill",
        "body": "We ran a simulated security incident drill involving engineering, legal, and comms to test our response playbook. Average time-to-containment in the simulation was 22 minutes, and we've since tightened two gaps the drill exposed.",
    },
    {
        "contributor_name": "Elena Torres",
        "team": "Sales",
        "title": "Top performer awards ceremony",
        "body": "This year's top-performer awards recognized five reps for exceeding 150% of quota, along with a new 'Rookie of the Year' award for reps in their first 12 months. Congratulations to all the winners.",
    },
    {
        "contributor_name": "Tomas Novak",
        "team": "Support",
        "title": "24/7 customer support coverage now live",
        "body": "As of this week, customer support is staffed around the clock across three time zones, closing the overnight coverage gap that had been our most common escalation source in customer feedback.",
    },
    {
        "contributor_name": "Devon Clarke",
        "team": "Executive",
        "title": "CEO town hall Q&A highlights",
        "body": "This quarter's town hall covered the FY27 strategic priorities, an update on the Austin office expansion, and an extended Q&A on remote work policy. A full recording and transcript are posted on the intranet.",
    },
]


def main():
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        register_vector(conn)
        for item in SUBMISSIONS:
            embedding = Vector(get_embedding(f"{item['title']}\n{item['body']}"))
            conn.execute(
                """
                INSERT INTO submissions (contributor_name, team, title, body, embedding)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (item["contributor_name"], item["team"], item["title"], item["body"], embedding),
            )
            print(f"  seeded: {item['title']}")
        conn.commit()
    print(f"Done — seeded {len(SUBMISSIONS)} submissions.")


if __name__ == "__main__":
    main()
