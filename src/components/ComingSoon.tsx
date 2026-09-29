import Button from "./Button";
import styles from "./ComingSoon.module.css";

export default function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <section className={`container ${styles.wrap}`}>
      <h1>{title}</h1>
      <p>{text}</p>
      <Button href="/" variant="soft">Back to home</Button>
    </section>
  );
}
